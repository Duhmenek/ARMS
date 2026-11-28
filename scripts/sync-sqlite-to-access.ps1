[CmdletBinding()]
param(
    [string]$SqlitePath,
    [string]$AccessPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectDir = Split-Path -Parent $scriptDir
if (-not $PSBoundParameters.ContainsKey('SqlitePath')) { $SqlitePath = Join-Path $projectDir 'data\arms.db' }
if (-not $PSBoundParameters.ContainsKey('AccessPath')) { $AccessPath = Join-Path $projectDir 'access\ARMS_BE.accdb' }

function Limit-AccessName([string]$Name) {
    if ($Name.Length -gt 64) { return $Name.Substring(0, 64) }
    return $Name
}
function Quote-AccessName([string]$Name) {
    $safeName = Limit-AccessName $Name
    return '[' + $safeName.Replace(']', ']]') + ']'
}
function Convert-ToSqlLiteral($Value) {
    if ($null -eq $Value) { return 'NULL' }
    if ($Value -is [bool]) { return [string][int]$Value }
    if ($Value -is [byte] -or $Value -is [int16] -or $Value -is [int32] -or $Value -is [int64] -or $Value -is [single] -or $Value -is [double] -or $Value -is [decimal]) {
        return ([Convert]::ToString($Value, [Globalization.CultureInfo]::InvariantCulture))
    }
    return "'" + ([string]$Value).Replace("'", "''") + "'"
}

if (-not (Test-Path -LiteralPath $SqlitePath -PathType Leaf)) { throw "SQLite database not found: $SqlitePath" }
if (-not (Test-Path -LiteralPath $AccessPath -PathType Leaf)) { throw "Access database not found: $AccessPath" }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { $node = Get-Command node -ErrorAction Stop }

$exportScript = Join-Path $scriptDir 'export-sqlite-json.cjs'
if (-not (Test-Path -LiteralPath $exportScript -PathType Leaf)) { throw "SQLite export script not found: $exportScript" }
# Read a consistent, read-only SQLite snapshot through the app's bundled Node SQLite API.
$snapshotText = & $node.Source $exportScript $SqlitePath
if ($LASTEXITCODE -ne 0) { throw 'Could not read the SQLite database.' }
$snapshotJson = [string]::Join([Environment]::NewLine, [string[]]$snapshotText)
$snapshot = ConvertFrom-Json -InputObject $snapshotJson
$tables = @($snapshot.tables)
if ($tables.Count -eq 0) { throw 'The SQLite export contained no tables.' }

$connection = $null
$transaction = $false
try {
    foreach ($provider in @('Microsoft.ACE.OLEDB.16.0', 'Microsoft.ACE.OLEDB.12.0')) {
        try {
            Write-Host "Opening Access with $provider..."
            $connection = New-Object -ComObject ADODB.Connection
            $connection.ConnectionTimeout = 15
            $connection.Open("Provider=$provider;Data Source=$AccessPath;Persist Security Info=False;")
            Write-Host "Connected with $provider."
            break
        } catch {
            if ($null -ne $connection) { try { $connection.Close() } catch {}; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($connection); $connection = $null }
        }
    }
    if ($null -eq $connection) { throw 'ACE OLEDB 16.0 or 12.0 could not open the Access file. Install the matching 32/64-bit Access Database Engine.' }

    # DDL runs before the data transaction because Access does not support transactional DDL.
    foreach ($table in $tables) {
        $target = Limit-AccessName ('web_' + [string]$table.name)
        Write-Host "Preparing $target..."
        $rs = $connection.OpenSchema(20) # adSchemaTables
        $exists = $false
        try { while (-not $rs.EOF) { if ([string]$rs.Fields.Item('TABLE_NAME').Value -eq $target) { $exists = $true }; $rs.MoveNext() } }
        finally { $rs.Close(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($rs) }
        if (-not $exists) {
            $definitions = foreach ($column in $table.columns) {
                $type = ([string]$column.type).ToUpperInvariant()
                $accessType = if ($type -match 'INT|BOOL') { 'LONG' } elseif ($type -match 'REAL|FLOA|DOUB') { 'DOUBLE' } elseif ($type -match 'DATE|TIME') { 'DATETIME' } else { 'LONGTEXT' }
                "$(Quote-AccessName $column.name) $accessType"
            }
            $truncatedColumns = @($table.columns | ForEach-Object { Limit-AccessName ([string]$_.name) })
            if (@($truncatedColumns | Select-Object -Unique).Count -ne $truncatedColumns.Count) {
                throw "Column names in SQLite table '$($table.name)' collide after Access's 64-character limit."
            }
            $connection.Execute("CREATE TABLE $(Quote-AccessName $target) ($($definitions -join ', '))") | Out-Null
        }
    }

    $connection.BeginTrans() | Out-Null
    $transaction = $true
    foreach ($table in $tables) {
        $target = Limit-AccessName ('web_' + [string]$table.name)
        $connection.Execute("DELETE FROM $(Quote-AccessName $target)") | Out-Null
        if ($table.rows.Count -eq 0) { continue }
        $columnNames = @($table.columns | ForEach-Object { Quote-AccessName ([string]$_.name) })
        $columnSql = $columnNames -join ', '
        foreach ($row in $table.rows) {
            $values = foreach ($column in $table.columns) { Convert-ToSqlLiteral $row.($column.name) }
            $connection.Execute("INSERT INTO $(Quote-AccessName $target) ($columnSql) VALUES ($($values -join ', '))") | Out-Null
        }
        Write-Host ("Refreshed {0}: {1} rows" -f $target, $table.rows.Count)
    }
    $connection.CommitTrans() | Out-Null
    $transaction = $false
    Write-Host "SQLite snapshot synchronized to $AccessPath"
}
catch {
    if ($transaction -and $null -ne $connection) { try { $connection.RollbackTrans() | Out-Null } catch {} }
    throw
}
finally {
    if ($null -ne $connection) { try { $connection.Close() } catch {}; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($connection) }
}
