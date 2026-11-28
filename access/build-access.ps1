[CmdletBinding()]
param(
    [switch]$Force,
    [string]$OutputDirectory = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Requires Windows, desktop Access, DAO.DBEngine.120, and 64-bit Access/VBA7.
$script:DbLong = 4
$script:DbDate = 8
$script:DbText = 10
$script:DbAutoIncr = 16
$script:AcModule = 5
$script:AcForm = 2
$script:AcMacro = 4
$script:AcLabel = 100
$script:AcButton = 104
$script:AcTextBox = 109
$script:AcComboBox = 111
$script:AcListBox = 110

function Release-Com([object]$Value) {
    if ($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)
    }
}

function Convert-SecureToPlainText([Security.SecureString]$Value) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function New-PasswordHash([string]$Password) {
    $salt = New-Object byte[] 16
    $passwordBytes = [Text.Encoding]::UTF8.GetBytes($Password)
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    $derive = $null
    try {
        $random.GetBytes($salt)
        $derive = [Security.Cryptography.Rfc2898DeriveBytes]::new(
            [byte[]]$passwordBytes, [byte[]]$salt, 210000,
            [Security.Cryptography.HashAlgorithmName]::SHA256
        )
        $hash = $derive.GetBytes(32)
        $saltText = [BitConverter]::ToString($salt).Replace('-', '').ToLowerInvariant()
        $hashText = [BitConverter]::ToString($hash).Replace('-', '').ToLowerInvariant()
        [Array]::Clear($hash, 0, $hash.Length)
        return "$saltText`$$hashText"
    }
    finally {
        [Array]::Clear($passwordBytes, 0, $passwordBytes.Length)
        [Array]::Clear($salt, 0, $salt.Length)
        if ($null -ne $derive) { $derive.Dispose() }
        $random.Dispose()
    }
}

function Get-SeedUsers {
    $users = @()
    foreach ($account in @(
        @{ Role='management'; FullName='ARMS Management'; Department='Archive Management' },
        @{ Role='custodian'; FullName='ARMS Custodian'; Department='Archive Custody' }
    )) {
        $secure = Read-Host "Set the $($account.Role) password (12+ characters)" -AsSecureString
        $plain = Convert-SecureToPlainText $secure
        try {
            if ($plain.Length -lt 12) { throw "The $($account.Role) password must be at least 12 characters." }
            $users += [pscustomobject]@{
                Username=$account.Role; FullName=$account.FullName; Department=$account.Department
                Role=$account.Role; PasswordHash=(New-PasswordHash $plain)
            }
        }
        finally {
            $plain = $null
            if ($null -ne $secure) { $secure.Dispose() }
        }
    }
    return $users
}

function Add-Field($Table, [string]$Name, [int]$Type, [int]$Size = 0, [switch]$AutoNumber) {
    if ($Size -gt 0) { $field = $Table.CreateField($Name, $Type, $Size) }
    else { $field = $Table.CreateField($Name, $Type) }
    if ($AutoNumber) { $field.Attributes = $script:DbAutoIncr }
    $Table.Fields.Append($field)
    Release-Com $field
}

function Add-PrimaryKey($Table, [string]$FieldName) {
    $index = $Table.CreateIndex('PrimaryKey')
    $index.Primary = $true; $index.Unique = $true
    $index.Fields.Append($index.CreateField($FieldName))
    $Table.Indexes.Append($index)
    Release-Com $index
}

function Add-Index($Table, [string]$Name, [string]$FieldName, [bool]$Unique = $false) {
    $index = $Table.CreateIndex($Name)
    $index.Unique = $Unique
    $index.Fields.Append($index.CreateField($FieldName))
    $Table.Indexes.Append($index)
    Release-Com $index
}

function Add-Relation($Database, [string]$Name, [string]$PrimaryTable, [string]$ForeignTable, [string]$PrimaryKey, [string]$ForeignKey) {
    $relation = $Database.CreateRelation($Name, $PrimaryTable, $ForeignTable, 0)
    $field = $relation.CreateField($PrimaryKey)
    $field.ForeignName = $ForeignKey
    $relation.Fields.Append($field)
    $Database.Relations.Append($relation)
    Release-Com $field; Release-Com $relation
}

function Add-Table($Database, [string]$Name, [scriptblock]$Build) {
    $table = $Database.CreateTableDef($Name)
    & $Build $table
    $Database.TableDefs.Append($table)
    Release-Com $table
}

function Add-DefaultLocations($Database) {
    $locations = $Database.TableDefs.Item('tblLocations')
    try {
        foreach ($zone in @('Zone A','Zone B','Zone C','Zone D')) {
            $row = $locations.OpenRecordset(2)
            try {
                $row.AddNew()
                $row.Fields.Item('Zone').Value = $zone
                $row.Fields.Item('Shelf').Value = 'Shelf 1'
                $row.Fields.Item('Folder').Value = 'Folder 1'
                $row.Fields.Item('MaxCapacity').Value = 50
                $row.Update()
            }
            finally { Release-Com $row }
        }
    }
    finally { Release-Com $locations }
}

function New-Backend([string]$Path, [object[]]$Users) {
    $engine = New-Object -ComObject DAO.DBEngine.120
    $database = $null
    try {
        $database = $engine.CreateDatabase($Path, ';LANGID=0x0409;CP=1252;COUNTRY=0')
        Add-Table $database 'tblUsers' {
            param($t)
            Add-Field $t UserID $script:DbLong -AutoNumber
            Add-Field $t FullName $script:DbText 150; Add-Field $t Department $script:DbText 120
            Add-Field $t Username $script:DbText 80; Add-Field $t Password $script:DbText 120
            Add-Field $t Role $script:DbText 20; Add-Field $t Status $script:DbText 20
            Add-PrimaryKey $t UserID; Add-Index $t idxUsersUsername Username $true; Add-Index $t idxUsersStatus Status
        }
        Add-Table $database 'tblLocations' {
            param($t)
            Add-Field $t LocationID $script:DbLong -AutoNumber
            Add-Field $t Zone $script:DbText 40; Add-Field $t Shelf $script:DbText 40
            Add-Field $t Folder $script:DbText 40; Add-Field $t MaxCapacity $script:DbLong
            Add-PrimaryKey $t LocationID; Add-Index $t idxLocationsZone Zone
            $ix = $t.CreateIndex('uqLocationPath'); $ix.Unique = $true
            $ix.Fields.Append($ix.CreateField('Zone')); $ix.Fields.Append($ix.CreateField('Shelf')); $ix.Fields.Append($ix.CreateField('Folder'))
            $t.Indexes.Append($ix); Release-Com $ix
        }
        Add-Table $database 'tblRecords' {
            param($t)
            Add-Field $t RecordID $script:DbLong -AutoNumber; Add-Field $t ARMSRef $script:DbText 40
            Add-Field $t RecordTitle $script:DbText 150; Add-Field $t RecordDescription $script:DbText 255
            Add-Field $t LocationID $script:DbLong; Add-Field $t TransactionType $script:DbText 80
            Add-Field $t MaterialDoc $script:DbText 80; Add-Field $t DeliveryPO $script:DbText 80
            Add-Field $t GRDate $script:DbDate; Add-Field $t MaterialNumber $script:DbText 80
            Add-Field $t VendorSiteNumber $script:DbText 80; Add-Field $t VAMNumber $script:DbText 80
            Add-Field $t FreightOrder $script:DbText 80; Add-Field $t NumPackages $script:DbLong
            Add-Field $t Operator $script:DbText 120; Add-Field $t Encoder $script:DbText 120
            Add-Field $t AssignedCustodian $script:DbText 120; Add-Field $t Checker $script:DbText 120
            Add-Field $t PlateNumber $script:DbText 40
            Add-Field $t RecordDate $script:DbDate; Add-Field $t CustodianID $script:DbLong
            Add-Field $t RetentionDueDate $script:DbDate; Add-Field $t RetentionStatus $script:DbText 20
            Add-Field $t Remarks $script:DbText 255; Add-Field $t Status $script:DbText 20
            Add-PrimaryKey $t RecordID; Add-Index $t idxRecordsARMSRef ARMSRef $true
            Add-Index $t idxRecordsLocation LocationID; Add-Index $t idxRecordsCustodian CustodianID; Add-Index $t idxRecordsStatus Status
        }
        Add-Table $database 'tblLogCounts' {
            param($t)
            Add-Field $t CountID $script:DbLong -AutoNumber; Add-Field $t RecordDate $script:DbDate
            Add-Field $t Shift $script:DbText 40; Add-Field $t Inbound $script:DbLong
            Add-Field $t Outbound $script:DbLong; Add-Field $t Scrap $script:DbLong
            Add-Field $t Inventory $script:DbLong; Add-Field $t RHTemp $script:DbLong
            Add-Field $t RackInspections $script:DbLong; Add-Field $t MHEPreOps $script:DbLong
            Add-Field $t EncodedCount $script:DbLong; Add-Field $t SubmittedBy $script:DbText 120
            Add-Field $t CustodianID $script:DbLong; Add-PrimaryKey $t CountID
            Add-Index $t idxLogCountsDate RecordDate; Add-Index $t idxLogCountsCustodian CustodianID
        }
        Add-Table $database 'tblBorrowRequests' {
            param($t)
            Add-Field $t RequestID $script:DbLong -AutoNumber; Add-Field $t SeriesNo $script:DbText 40
            Add-Field $t RecordID $script:DbLong; Add-Field $t RequestedBy $script:DbLong
            Add-Field $t Requisitioner $script:DbText 150
            Add-Field $t FamilyName $script:DbText 80; Add-Field $t GivenName $script:DbText 80
            Add-Field $t Designation $script:DbText 100; Add-Field $t Purpose $script:DbText 255
            Add-Field $t RequestDate $script:DbDate; Add-Field $t Status $script:DbText 20
            Add-Field $t ApprovedBy $script:DbLong; Add-Field $t ApprovedDate $script:DbDate
            Add-Field $t Notes $script:DbText 255; Add-PrimaryKey $t RequestID
            Add-Index $t idxBorrowSeries SeriesNo $true; Add-Index $t idxBorrowRecord RecordID
            Add-Index $t idxBorrowRequester RequestedBy; Add-Index $t idxBorrowStatus Status
        }
        Add-Table $database 'tblAuditLogs' {
            param($t)
            Add-Field $t LogID $script:DbLong -AutoNumber; Add-Field $t LoggedAt $script:DbDate
            Add-Field $t UserID $script:DbLong; Add-Field $t Action $script:DbText 80
            Add-Field $t Details $script:DbText 255; Add-PrimaryKey $t LogID
            Add-Index $t idxAuditLoggedAt LoggedAt; Add-Index $t idxAuditUser UserID
        }
        Add-Table $database 'tblRecordLineItems' {
            param($t)
            Add-Field $t ItemID $script:DbLong -AutoNumber; Add-Field $t RecordID $script:DbLong
            Add-Field $t BatchCode $script:DbText 80; Add-Field $t ProductionDate $script:DbDate
            Add-Field $t ExpirationDate $script:DbDate; Add-Field $t Quantity $script:DbText 40
            Add-PrimaryKey $t ItemID; Add-Index $t idxLineItemsRecord RecordID
        }
        Add-Relation $database relRecordsLocation tblLocations tblRecords LocationID LocationID
        Add-Relation $database relRecordsCustodian tblUsers tblRecords UserID CustodianID
        Add-Relation $database relLogCountsCustodian tblUsers tblLogCounts UserID CustodianID
        Add-Relation $database relBorrowRecord tblRecords tblBorrowRequests RecordID RecordID
        Add-Relation $database relBorrowRequester tblUsers tblBorrowRequests UserID RequestedBy
        Add-Relation $database relBorrowApprover tblUsers tblBorrowRequests UserID ApprovedBy
        Add-Relation $database relAuditUser tblUsers tblAuditLogs UserID UserID
        Add-Relation $database relRecordLineItems tblRecords tblRecordLineItems RecordID RecordID
        foreach ($user in $Users) {
            $values = @($user.FullName,$user.Department,$user.Username,$user.PasswordHash,$user.Role)
            $quoted = foreach ($value in $values) { "'$(([string]$value).Replace("'","''"))'" }
            $database.Execute("INSERT INTO tblUsers (FullName,Department,Username,[Password],Role,Status) VALUES ($($quoted -join ','),'approved')", 128)
        }
        Add-DefaultLocations $database
    }
    finally {
        if ($null -ne $database) { try { $database.Close() } catch {}; Release-Com $database }
        Release-Com $engine
    }
}

function Add-LinkedTables($Database, [string]$BackendPath) {
    foreach ($name in @('tblUsers','tblLocations','tblRecords','tblLogCounts','tblBorrowRequests','tblAuditLogs','tblRecordLineItems')) {
        $table = $Database.CreateTableDef($name, 0, $name, ";DATABASE=$BackendPath")
        $Database.TableDefs.Append($table); Release-Com $table
    }
}

function Add-StorageQuery($Database) {
    # ACE is more reliable when the per-location aggregate is a saved query
    # rather than an inline derived table in a FROM clause.
    $occupiedSql = @'
SELECT LocationID, Count(RecordID) AS OccupiedSlots
FROM tblRecords
WHERE Nz(Status,'')<>'Borrowed'
GROUP BY LocationID;
'@
    $query = $Database.CreateQueryDef('qryOccupiedByLocation', $occupiedSql)
    Release-Com $query
    $sql = @'
SELECT l.Zone, l.Shelf,
       Sum(l.MaxCapacity) AS TotalCapacity,
       Sum(Nz(q.OccupiedSlots,0)) AS OccupiedSlots,
       Round(IIf(Sum(l.MaxCapacity)=0,0,
           Sum(Nz(q.OccupiedSlots,0))/Sum(l.MaxCapacity)*100),2) AS OccupancyPercent,
       IIf(IIf(Sum(l.MaxCapacity)=0,0,
           Sum(Nz(q.OccupiedSlots,0))/Sum(l.MaxCapacity)*100)>85,
           'EXPANSION NEEDED / REDUCE RETENTION','WITHIN CAPACITY') AS CapacityAlert
FROM tblLocations AS l LEFT JOIN qryOccupiedByLocation AS q
    ON l.LocationID=q.LocationID
GROUP BY l.Zone,l.Shelf
ORDER BY l.Zone,l.Shelf;
'@
    $query = $Database.CreateQueryDef('qryStorageUtilization', $sql)
    Release-Com $query
    $recordsSql = @'
SELECT r.RecordID, r.ARMSRef, r.RecordTitle, r.RecordDescription, r.TransactionType,
       r.MaterialDoc, r.DeliveryPO, r.GRDate, r.MaterialNumber, r.NumPackages,
       r.RetentionDueDate, r.RetentionStatus, r.Status, r.Remarks,
       r.AssignedCustodian, r.Encoder, r.Checker, r.PlateNumber,
       l.Zone, l.Shelf, l.Folder, l.MaxCapacity
FROM tblRecords AS r LEFT JOIN tblLocations AS l ON r.LocationID=l.LocationID
ORDER BY r.RecordDate DESC, r.RecordID DESC;
'@
    $query = $Database.CreateQueryDef('qryRecordsReport', $recordsSql); Release-Com $query
    $borrowSql = @'
SELECT b.RequestID, b.SeriesNo, r.ARMSRef, b.FamilyName, b.GivenName,
       b.Designation, b.Purpose, b.RequestDate, b.Status, b.ApprovedDate,
       b.RequestedBy
FROM tblBorrowRequests AS b INNER JOIN tblRecords AS r ON b.RecordID=r.RecordID
ORDER BY b.RequestDate DESC;
'@
    $query = $Database.CreateQueryDef('qryBorrowReport', $borrowSql); Release-Com $query
    $auditSql = 'SELECT LoggedAt, UserID, [Action], Details FROM tblAuditLogs ORDER BY LoggedAt DESC;'
    $query = $Database.CreateQueryDef('qryAuditReport', $auditSql); Release-Com $query
    $retentionSql = @'
SELECT ARMSRef, RecordTitle, TransactionType, RetentionDueDate, RetentionStatus,
       Zone, Shelf, Folder, AssignedCustodian, Status
FROM qryRecordsReport
ORDER BY RetentionDueDate;
'@
    $query = $Database.CreateQueryDef('qryRetentionReport', $retentionSql); Release-Com $query
    $complianceSql = @'
SELECT Nz(Encoder,'Unassigned') AS EncodingUser, DateValue(GRDate) AS EntryDay,
       Count(RecordID) AS EncodedEntries, 'Tracked' AS ComplianceStatus
FROM tblRecords
WHERE GRDate Is Not Null
GROUP BY Nz(Encoder,'Unassigned'), DateValue(GRDate)
ORDER BY DateValue(GRDate) DESC;
'@
    $query = $Database.CreateQueryDef('qryComplianceReport', $complianceSql); Release-Com $query
}

function Add-Control([int]$Type, [string]$Name, [string]$Caption, [int]$Left, [int]$Top, [int]$Width, [int]$Height, [string]$RowSource = '') {
    $control = [ordered]@{ Type=$Type; Name=$Name; Caption=$Caption; Left=$Left; Top=$Top; Width=$Width; Height=$Height; RowSource=$RowSource; RowSourceType='Table/Query'; InputMask=''; OnClick=''; BoundColumn=1; ColumnCount=1; ColumnWidths='' }
    $script:FormControls.Add($control)
    return $control
}

function Add-Label([string]$Name, [string]$Text, [int]$Y, [int]$Left = 400, [int]$Width = 2800) {
    [void](Add-Control $script:AcLabel $Name $Text $Left $Y $Width 300)
}

function Add-TextInput([string]$Name, [string]$Label, [int]$Y, [switch]$Password,
    [int]$LabelLeft = 400, [int]$LabelWidth = 2400, [int]$InputLeft = 3000, [int]$InputWidth = 3500) {
    Add-Label "lbl$Name" $Label $Y $LabelLeft $LabelWidth
    $control = Add-Control $script:AcTextBox $Name '' $InputLeft ($Y - 40) $InputWidth 360
    $control.Enabled = $true; $control.Locked = $false
    if ($Password) { $control.InputMask = 'Password' }
}

function Add-Button([string]$Name, [string]$Caption, [int]$Y, [int]$Left = 600, [int]$Width = 2600) {
    $control = Add-Control $script:AcButton $Name $Caption $Left $Y $Width 500
    $control.OnClick = '[Event Procedure]'
}

function Add-Combo([string]$Name, [string]$Label, [int]$Y, [string]$Rows,
    [int]$LabelLeft = 400, [int]$LabelWidth = 2400, [int]$InputLeft = 3000, [int]$InputWidth = 4200) {
    Add-Label "lbl$Name" $Label $Y $LabelLeft $LabelWidth
    $control = Add-Control $script:AcComboBox $Name '' $InputLeft ($Y - 40) $InputWidth 360 $Rows
    $control.BoundColumn = 1; $control.ColumnCount = 2; $control.ColumnWidths = '0;3.5'
}

function Add-ValueCombo([string]$Name, [string]$Label, [int]$Y, [string]$Values, [int]$Left = 3000, [int]$Width = 4200) {
    Add-Label "lbl$Name" $Label $Y
    $control = Add-Control $script:AcComboBox $Name '' $Left ($Y - 40) $Width 360 $Values
    $control.RowSourceType = 'Value List'; $control.BoundColumn = 1; $control.ColumnCount = 1
}

function Add-ListBox([string]$Name, [int]$Left, [int]$Top, [int]$Width, [int]$Height, [string]$Rows, [int]$Columns, [string]$ColumnWidths) {
    $control = Add-Control $script:AcListBox $Name '' $Left $Top $Width $Height $Rows
    $control.BoundColumn = 1; $control.ColumnCount = $Columns; $control.ColumnWidths = $ColumnWidths
}

function Get-ModAuthSource {
    return @'
Attribute VB_Name = "modAuth"
Option Compare Database
Option Explicit

#If VBA7 Then
Private Declare PtrSafe Function BCryptOpenAlgorithmProvider Lib "bcrypt.dll" (ByRef phAlgorithm As LongPtr, ByVal pszAlgId As LongPtr, ByVal pszImplementation As LongPtr, ByVal dwFlags As Long) As Long
Private Declare PtrSafe Function BCryptDeriveKeyPBKDF2 Lib "bcrypt.dll" (ByVal hPrf As LongPtr, ByRef pbPassword As Any, ByVal cbPassword As Long, ByRef pbSalt As Any, ByVal cbSalt As Long, ByVal cIterations As LongLong, ByRef pbDerivedKey As Any, ByVal cbDerivedKey As Long, ByVal dwFlags As Long) As Long
Private Declare PtrSafe Function BCryptGenRandom Lib "bcrypt.dll" (ByVal hAlgorithm As LongPtr, ByRef pbBuffer As Any, ByVal cbBuffer As Long, ByVal dwFlags As Long) As Long
Private Declare PtrSafe Function BCryptCloseAlgorithmProvider Lib "bcrypt.dll" (ByVal hAlgorithm As LongPtr, ByVal dwFlags As Long) As Long
#End If

Public Function SqlText(ByVal value As Variant) As String
    SqlText = "'" & Replace(Nz(value, ""), "'", "''") & "'"
End Function

Private Function DerivePasswordHash(ByVal rawPassword As String, ByRef salt() As Byte) As String
    Dim stream As Object, binaryData As Variant, inputBytes() As Byte
    Dim digest(0 To 31) As Byte, emptyInput As Byte, algorithm As LongPtr
    Dim status As Long, i As Long, result As String
    On Error GoTo HashFailed
    If Len(rawPassword) > 0 Then
        Set stream = CreateObject("ADODB.Stream")
        stream.Type = 2: stream.Charset = "utf-8": stream.Open
        stream.WriteText rawPassword
        stream.Position = 0: stream.Type = 1: stream.Position = 3
        binaryData = stream.Read: inputBytes = binaryData: stream.Close
    End If
    status = BCryptOpenAlgorithmProvider(algorithm, StrPtr("SHA256"), 0, 8)
    If status <> 0 Then GoTo HashFailed
    If Len(rawPassword) > 0 Then
        status = BCryptDeriveKeyPBKDF2(algorithm, inputBytes(0), UBound(inputBytes) + 1, salt(0), UBound(salt) + 1, 210000, digest(0), 32, 0)
    Else
        status = BCryptDeriveKeyPBKDF2(algorithm, emptyInput, 0, salt(0), UBound(salt) + 1, 210000, digest(0), 32, 0)
    End If
    If status <> 0 Then GoTo HashFailed
    For i = 0 To 31: result = result & LCase$(Right$("0" & Hex$(digest(i)), 2)): Next i
    DerivePasswordHash = result
HashCleanup:
    On Error Resume Next
    If algorithm <> 0 Then BCryptCloseAlgorithmProvider algorithm, 0
    If Not stream Is Nothing Then stream.Close
    Exit Function
HashFailed:
    DerivePasswordHash = vbNullString
    Resume HashCleanup
End Function

Public Function HashPassword(ByVal rawPassword As String) As String
    Dim salt(0 To 15) As Byte, status As Long, i As Long, saltHex As String
    status = BCryptGenRandom(0, salt(0), 16, 2)
    If status <> 0 Then Exit Function
    For i = 0 To 15: saltHex = saltHex & LCase$(Right$("0" & Hex$(salt(i)), 2)): Next i
    HashPassword = saltHex & "$" & DerivePasswordHash(rawPassword, salt)
End Function

Public Function VerifyPassword(ByVal rawPassword As String, ByVal storedValue As String) As Boolean
    Dim saltHex As String, expected As String, actual As String, salt() As Byte, i As Long
    If Len(storedValue) <> 97 Or Mid$(storedValue, 33, 1) <> "$" Then Exit Function
    saltHex = Left$(storedValue, 32): expected = Mid$(storedValue, 34): ReDim salt(0 To 15)
    For i = 0 To 15: salt(i) = CByte(Val("&H" & Mid$(saltHex, i * 2 + 1, 2))): Next i
    actual = DerivePasswordHash(rawPassword, salt)
    VerifyPassword = (StrComp(actual, expected, vbBinaryCompare) = 0)
End Function

Public Sub StartSession(ByVal userID As Long, ByVal userRole As String)
    On Error Resume Next
    TempVars.Remove "UserID": TempVars.Remove "Role"
    On Error GoTo 0
    TempVars.Add "UserID", userID: TempVars.Add "Role", userRole
End Sub

Public Sub AuditAction(ByVal actionName As String, ByVal details As String)
    CurrentDb.Execute "INSERT INTO tblAuditLogs (LoggedAt,UserID,[Action],Details) VALUES (Now()," & _
        CLng(TempVars!UserID) & "," & SqlText(actionName) & "," & SqlText(details) & ")", dbFailOnError
End Sub

Public Function IsManagement() As Boolean
    IsManagement = (Nz(TempVars!Role, "") = "management" Or Nz(TempVars!Role, "") = "admin")
End Function
'@
}

function Add-ModuleText($Access, [string]$Name, [string]$Source, [string]$TemporaryDirectory) {
    $path = Join-Path $TemporaryDirectory "$Name.txt"
    [IO.File]::WriteAllText($path, $Source, [System.Text.Encoding]::ASCII)
    $Access.LoadFromText($script:AcModule, $Name, $path)
}

function Add-NativeForm($Access, [string]$Name, [string]$Caption, [scriptblock]$BuildControls, [string]$Vba, [int]$FormWidth = 9000, [int]$DetailHeight = 5000) {
    $script:FormControls = [System.Collections.Generic.List[object]]::new()
    & $BuildControls
    $form = $null
    $temporaryName = $null
    $formType = $script:AcForm
    try {
        $form = $Access.CreateForm()
        $temporaryName = [string]$form.Name
        $form.Caption = $Caption
        $form.Width = $FormWidth
        $form.HasModule = $true
        $form.Section(0).Height = $DetailHeight
        if ($Vba -match 'Private Sub Form_Load\(') { $form.OnLoad = '[Event Procedure]' }

        foreach ($c in $script:FormControls) {
            $control = $Access.CreateControl($temporaryName, $c.Type, 0, 0, '', $c.Left, $c.Top, $c.Width, $c.Height)
            try {
                $control.Name = $c.Name
                if ($c.Type -eq $script:AcLabel -or $c.Type -eq $script:AcButton) { $control.Caption = $c.Caption }
                if ($c.Type -eq $script:AcTextBox) {
                    $control.Enabled = $true
                    $control.Locked = $false
                    if ($c.InputMask) { $control.InputMask = $c.InputMask }
                }
                if ($c.Type -eq $script:AcButton) { $control.OnClick = '[Event Procedure]' }
                if ($c.Type -eq $script:AcComboBox -or $c.Type -eq $script:AcListBox) {
                    $control.RowSourceType = $c.RowSourceType
                    $control.RowSource = $c.RowSource
                    $control.BoundColumn = $c.BoundColumn
                    $control.ColumnCount = $c.ColumnCount
                    $control.ColumnWidths = $c.ColumnWidths
                }
            }
            finally { Release-Com $control }
        }

        $Access.DoCmd.Save($formType, $temporaryName)
        $Access.DoCmd.Close($formType, $temporaryName, 1)
        Release-Com $form
        $form = $null
        $Access.DoCmd.Rename($Name, $formType, $temporaryName)

        # Open in Design view so the saved form's VBE component is addressable.
        $Access.DoCmd.OpenForm($Name, 1)
        $componentName = "Form_$Name"
        $vbe = $null; $project = $null; $components = $null; $component = $null
        try {
            $vbe = $Access.VBE
            $project = $vbe.ActiveVBProject
            $components = $project.VBComponents
            $component = $components.Item($componentName)
            $component.CodeModule.AddFromString($Vba)
        }
        finally {
            Release-Com $component; Release-Com $components; Release-Com $project; Release-Com $vbe
        }
        $Access.DoCmd.Save($formType, $Name)
        $Access.DoCmd.Close($formType, $Name, 1)
    }
    finally {
        if ($null -ne $form) { Release-Com $form }
    }
}

function Add-WorkflowForms($Access) {
    $findVba = @'
Private Sub Form_Load()
    Me.cboStatus = "ALL": RefreshRecordList
    Me.cmdReturn.Visible = IsManagement()
End Sub
Private Sub RefreshRecordList()
    Dim sql As String, q As String, statusValue As String
    q = Replace(Nz(Me.txtSearch, ""), "'", "''")
    statusValue = Nz(Me.cboStatus, "ALL")
    sql = "SELECT r.RecordID,r.ARMSRef,Nz(r.RecordTitle,'')," & _
          "Nz(l.Zone,'') & ' / ' & Nz(l.Shelf,'') & ' / ' & Nz(l.Folder,''),r.Status " & _
          "FROM tblRecords AS r LEFT JOIN tblLocations AS l ON r.LocationID=l.LocationID WHERE 1=1 "
    If Len(q) > 0 Then
        sql = sql & " AND (r.ARMSRef Like '*" & q & "*' OR r.RecordTitle Like '*" & q & "*' " & _
            "OR r.RecordDescription Like '*" & q & "*' OR l.Zone Like '*" & q & "*' " & _
            "OR l.Shelf Like '*" & q & "*' OR l.Folder Like '*" & q & "*' OR r.Status Like '*" & q & "*')"
    End If
    If statusValue <> "ALL" Then sql = sql & " AND r.Status=" & SqlText(statusValue)
    sql = sql & " ORDER BY r.RecordDate DESC,r.RecordID DESC;"
    Me.lstRecords.RowSource = sql: Me.lstRecords.Requery
End Sub
Private Sub cmdSearch_Click(): RefreshRecordList: End Sub
Private Sub cmdNewRecord_Click(): DoCmd.OpenForm "frmRecordEntry": End Sub
Private Sub cmdBorrow_Click()
    If IsNull(Me.lstRecords) Then MsgBox "Select an available record first.", vbExclamation: Exit Sub
    If Nz(Me.lstRecords.Column(4), "") <> "Available" Then MsgBox "Only available records can be requested.", vbExclamation: Exit Sub
    DoCmd.OpenForm "frmBorrowRequest", , , , , , CStr(Me.lstRecords.Column(1))
End Sub
Private Sub cmdReturn_Click()
    Dim recordID As Long, ref As String
    If Not IsManagement() Then MsgBox "Management role required to check in a borrowed file.", vbCritical: Exit Sub
    If IsNull(Me.lstRecords) Then MsgBox "Select a borrowed record first.", vbExclamation: Exit Sub
    If Nz(Me.lstRecords.Column(4), "") <> "Borrowed" Then MsgBox "The selected record is not currently pulled out.", vbExclamation: Exit Sub
    recordID = CLng(Me.lstRecords.Column(0)): ref = CStr(Me.lstRecords.Column(1))
    CurrentDb.Execute "UPDATE tblRecords SET Status='Available' WHERE RecordID=" & recordID, dbFailOnError
    CurrentDb.Execute "UPDATE tblBorrowRequests SET Status='Returned' WHERE RecordID=" & recordID & " AND Status='Approved'", dbFailOnError
    AuditAction "RETURN", "Returned ARMS Ref " & ref
    RefreshRecordList
End Sub
Private Sub cmdClose_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmFindFile' 'Find File / Record Search' {
        Add-TextInput 'txtSearch' 'Search ARMS Ref, title, description, location, or status' 650
        Add-ValueCombo 'cboStatus' 'Status filter' 1250 'ALL;Available;Borrowed;Pending' 3000 3600
        Add-Button 'cmdSearch' 'Search' 1850 7000 1700
        Add-ListBox 'lstRecords' 400 2500 12600 3200 '' 5 '0;1.7;2.6;5.0;1.5'
        Add-Button 'cmdNewRecord' 'Add New Record' 6100 400 2300
        Add-Button 'cmdBorrow' 'Request Pull-Out' 6100 3000 2300
        Add-Button 'cmdReturn' 'Check In / Return' 6100 5600 2300
        Add-Button 'cmdClose' 'Close' 6100 8200 1800
    } $findVba 14000 7200

    $entryVba = @'
Private Sub Form_Load()
    Me.txtEncoder=Nz(DLookup("FullName","tblUsers","UserID=" & CLng(TempVars!UserID)),"")
    Me.txtAssignedCustodian=Me.txtEncoder: Me.txtGRDate=Date: Me.cboRetentionStatus="Active"
End Sub
Private Function SqlDateValue(ByVal value As Variant) As String
    If IsDate(value) Then SqlDateValue = "#" & Format$(CDate(value), "yyyy-mm-dd") & "#" Else SqlDateValue = "Null"
End Function
Private Sub cmdSave_Click()
    Dim locID As Long, userID As Long, packages As Long, titleValue As String, recordID As Long, assigned As String
    If Len(Trim$(Nz(Me.txtARMSRef, ""))) = 0 Then MsgBox "ARMS Reference is required.", vbExclamation: Exit Sub
    If DCount("*", "tblRecords", "ARMSRef=" & SqlText(Me.txtARMSRef)) > 0 Then MsgBox "That ARMS Reference already exists.", vbExclamation: Exit Sub
    If IsNull(Me.cboLocation) Then MsgBox "Choose a storage location.", vbExclamation: Exit Sub
    locID = CLng(Me.cboLocation): userID = CLng(TempVars!UserID)
    packages = CLng(Val(Nz(Me.txtNumPackages, "0"))): titleValue = Nz(Me.txtTitle, "")
    assigned=Nz(Me.txtAssignedCustodian,DLookup("FullName","tblUsers","UserID=" & userID))
    CurrentDb.Execute "INSERT INTO tblRecords (ARMSRef,RecordTitle,RecordDescription,LocationID,TransactionType," & _
        "MaterialDoc,DeliveryPO,GRDate,MaterialNumber,VendorSiteNumber,VAMNumber,FreightOrder,NumPackages,Operator,Encoder," & _
        "AssignedCustodian,Checker,PlateNumber,RetentionDueDate,RetentionStatus,Remarks,RecordDate,CustodianID,Status) VALUES (" & _
        SqlText(Me.txtARMSRef) & "," & SqlText(titleValue) & "," & SqlText(Nz(Me.txtDescription,"")) & "," & locID & "," & _
        SqlText(Nz(Me.txtTransactionType,"Other")) & "," & SqlText(Nz(Me.txtMaterialDoc,"")) & "," & _
        SqlText(Nz(Me.txtDeliveryPO,"")) & "," & SqlDateValue(Me.txtGRDate) & "," & SqlText(Nz(Me.txtMaterialNumber,"")) & "," & _
        SqlText(Nz(Me.txtVendorSiteNumber,"")) & "," & SqlText(Nz(Me.txtVAMNumber,"")) & "," & SqlText(Nz(Me.txtFreightOrder,"")) & "," & _
        packages & "," & SqlText(Nz(Me.txtOperator,"")) & "," & SqlText(Nz(Me.txtEncoder,DLookup("FullName","tblUsers","UserID=" & userID))) & "," & _
        SqlText(assigned) & "," & SqlText(Nz(Me.txtChecker,"")) & "," & SqlText(Nz(Me.txtPlateNumber,"")) & "," & _
        SqlDateValue(Me.txtRetentionDate) & "," & SqlText(Nz(Me.cboRetentionStatus,"Active")) & "," & _
        SqlText(Nz(Me.txtRemarks,"")) & ",Now()," & userID & ",'Available')", dbFailOnError
    recordID=CLng(DLookup("RecordID","tblRecords","ARMSRef=" & SqlText(Me.txtARMSRef)))
    If Len(Trim$(Nz(Me.txtBatchCode,"")))>0 Then
        CurrentDb.Execute "INSERT INTO tblRecordLineItems (RecordID,BatchCode,ProductionDate,ExpirationDate,Quantity) VALUES (" & _
            recordID & "," & SqlText(Me.txtBatchCode) & "," & SqlDateValue(Me.txtProductionDate) & "," & _
            SqlDateValue(Me.txtExpirationDate) & "," & SqlText(Nz(Me.txtQuantity,"")) & ")", dbFailOnError
    End If
    AuditAction "RECORD_REGISTERED", "Registered ARMS Ref " & Nz(Me.txtARMSRef, "")
    MsgBox "Record registered successfully.", vbInformation
    DoCmd.OpenForm "frmLineItems", , , , , , CStr(recordID)
    DoCmd.Close acForm, Me.Name
End Sub
Private Sub cmdCancel_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmRecordEntry' 'Record Registration' {
        Add-TextInput 'txtARMSRef' 'ARMS Reference (required)' 550
        Add-TextInput 'txtTitle' 'Record title' 1100
        Add-TextInput 'txtDescription' 'Description' 1650
        Add-TextInput 'txtTransactionType' 'Transaction type' 2200
        Add-Combo 'cboLocation' 'Storage location (Zone / Shelf / Folder)' 2750 'SELECT LocationID,Zone & " / " & Shelf & " / " & Folder FROM tblLocations ORDER BY Zone,Shelf,Folder;'
        Add-TextInput 'txtMaterialDoc' 'Material document' 3300
        Add-TextInput 'txtDeliveryPO' 'Delivery PO / DO' 3850
        Add-TextInput 'txtGRDate' 'GR date' 4400
        Add-TextInput 'txtMaterialNumber' 'Material number' 4950
        Add-TextInput 'txtNumPackages' 'Number of packages' 5500
        Add-TextInput 'txtRetentionDate' 'Retention / disposal due date' 6050
        Add-ValueCombo 'cboRetentionStatus' 'Retention status' 6600 'Active;Semi-Active;Near Expiry;Disposal Due'
        Add-TextInput 'txtRemarks' 'Remarks' 7150
        Add-TextInput 'txtVendorSiteNumber' 'Vendor site number' 550 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtVAMNumber' 'VAM number' 1150 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtFreightOrder' 'Freight order' 1750 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtOperator' 'Operator' 2350 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtEncoder' 'Encoder' 2950 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtAssignedCustodian' 'Assigned custodian' 3550 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtChecker' 'Checker' 4150 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtPlateNumber' 'Plate number' 4750 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtBatchCode' 'Line item batch code' 5350 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtProductionDate' 'Line item production date' 5950 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtExpirationDate' 'Line item expiration date' 6550 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-TextInput 'txtQuantity' 'Line item quantity' 7150 -LabelLeft 7400 -InputLeft 9900 -InputWidth 3500
        Add-Button 'cmdSave' 'Save Record' 8000 4500 2200
        Add-Button 'cmdCancel' 'Cancel' 8000 7000 1800
    } $entryVba 14000 9000

    $lineItemsVba = @'
Private Sub Form_Load()
    If Not IsNumeric(Nz(Me.OpenArgs,"")) Then MsgBox "A saved record is required.", vbExclamation: DoCmd.Close acForm, Me.Name: Exit Sub
    RefreshItems
End Sub
Private Sub RefreshItems()
    Me.lstItems.RowSource="SELECT BatchCode,ProductionDate,ExpirationDate,Quantity FROM tblRecordLineItems WHERE RecordID=" & CLng(Me.OpenArgs) & " ORDER BY ItemID;"
    Me.lstItems.Requery
End Sub
Private Function DateSql(ByVal value As Variant) As String
    If IsDate(value) Then DateSql="#" & Format$(CDate(value),"yyyy-mm-dd") & "#" Else DateSql="Null"
End Function
Private Sub cmdAdd_Click()
    If Len(Trim$(Nz(Me.txtBatchCode,"")))=0 Then MsgBox "Enter a batch code.", vbExclamation: Exit Sub
    CurrentDb.Execute "INSERT INTO tblRecordLineItems (RecordID,BatchCode,ProductionDate,ExpirationDate,Quantity) VALUES (" & _
        CLng(Me.OpenArgs) & "," & SqlText(Me.txtBatchCode) & "," & DateSql(Me.txtProductionDate) & "," & _
        DateSql(Me.txtExpirationDate) & "," & SqlText(Nz(Me.txtQuantity,"")) & ")", dbFailOnError
    AuditAction "LINE_ITEM_ADDED", "Added batch details to RecordID " & CLng(Me.OpenArgs)
    Me.txtBatchCode=Null: Me.txtProductionDate=Null: Me.txtExpirationDate=Null: Me.txtQuantity=Null
    RefreshItems
End Sub
Private Sub cmdDone_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmLineItems' 'Record Line Items' {
        Add-TextInput 'txtBatchCode' 'Batch code' 450
        Add-TextInput 'txtProductionDate' 'Production date' 1000
        Add-TextInput 'txtExpirationDate' 'Expiration date' 1550
        Add-TextInput 'txtQuantity' 'Quantity' 2100
        Add-Button 'cmdAdd' 'Add Another Item' 2850 3000 2400
        Add-ListBox 'lstItems' 400 3500 8800 2100 '' 4 '2.2;1.8;1.8;1.5'
        Add-Button 'cmdDone' 'Done' 5900 3000 1800
    } $lineItemsVba 10000 7000

    $borrowVba = @'
Private Sub Form_Load()
    If Len(Nz(Me.OpenArgs,"")) > 0 Then Me.cboAvailableRecord = DLookup("RecordID","tblRecords","ARMSRef=" & SqlText(Me.OpenArgs) & " AND Status='Available'")
End Sub
Private Sub cmdSubmit_Click()
    Dim recordID As Long, seriesNo As String, family As String, given As String
    If IsNull(Me.cboAvailableRecord) Then MsgBox "Select an available file.", vbExclamation: Exit Sub
    If Len(Trim$(Nz(Me.txtFamilyName,"")))=0 Or Len(Trim$(Nz(Me.txtGivenName,"")))=0 Then MsgBox "Enter the borrower's name.", vbExclamation: Exit Sub
    recordID=CLng(Me.cboAvailableRecord): family=Trim$(Me.txtFamilyName): given=Trim$(Me.txtGivenName)
    seriesNo="BR-" & Format$(Now(),"yyyymmddhhnnss")
    CurrentDb.Execute "INSERT INTO tblBorrowRequests (SeriesNo,RecordID,RequestedBy,Requisitioner,FamilyName,GivenName,Designation,Purpose,RequestDate,Status) VALUES (" & _
        SqlText(seriesNo) & "," & recordID & "," & CLng(TempVars!UserID) & "," & SqlText(given & " " & family) & "," & SqlText(family) & "," & _
        SqlText(given) & "," & SqlText(Nz(Me.txtDesignation,"")) & "," & SqlText(Nz(Me.txtPurpose,"")) & ",Now(),'Pending')", dbFailOnError
    CurrentDb.Execute "UPDATE tblRecords SET Status='Pending' WHERE RecordID=" & recordID, dbFailOnError
    AuditAction "BORROW_REQUEST", "Submitted " & seriesNo & " for RecordID " & recordID
    MsgBox "Pull-out request submitted: " & seriesNo, vbInformation
    DoCmd.Close acForm, Me.Name
End Sub
Private Sub cmdCancel_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmBorrowRequest' 'Pull-Out / Borrow Request' {
        Add-Combo 'cboAvailableRecord' 'Available records' 600 'SELECT RecordID,ARMSRef & " - " & RecordTitle FROM tblRecords WHERE Status="Available" ORDER BY ARMSRef;'
        Add-TextInput 'txtFamilyName' 'Borrower family name' 1250
        Add-TextInput 'txtGivenName' 'Borrower given name' 1800
        Add-TextInput 'txtDesignation' 'Designation' 2350
        Add-TextInput 'txtPurpose' 'Purpose / audit reason' 2900
        Add-Button 'cmdSubmit' 'Submit Request' 3700 3000 2200
        Add-Button 'cmdCancel' 'Cancel' 3700 5500 1800
    } $borrowVba 10000 5000

    $approvalVba = @'
Private Sub Form_Load()
    Dim allowed As Boolean
    allowed=IsManagement(): Me.cmdApprove.Visible=allowed: Me.cmdReject.Visible=allowed
    RefreshRequests
End Sub
Private Sub RefreshRequests()
    Me.lstRequests.RowSource="SELECT b.RequestID,b.RecordID,r.ARMSRef,b.SeriesNo,b.FamilyName & ', ' & b.GivenName,b.Designation,b.RequestDate " & _
        "FROM tblBorrowRequests AS b INNER JOIN tblRecords AS r ON b.RecordID=r.RecordID WHERE b.Status='Pending' ORDER BY b.RequestDate;"
    Me.lstRequests.Requery
End Sub
Private Sub cmdApprove_Click()
    Dim requestID As Long, recordID As Long, ref As String
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    If IsNull(Me.lstRequests) Then MsgBox "Select a pending request.", vbExclamation: Exit Sub
    requestID=CLng(Me.lstRequests.Column(0)): recordID=CLng(Me.lstRequests.Column(1)): ref=CStr(Me.lstRequests.Column(2))
    CurrentDb.Execute "UPDATE tblBorrowRequests SET Status='Approved',ApprovedBy=" & CLng(TempVars!UserID) & ",ApprovedDate=Now() WHERE RequestID=" & requestID, dbFailOnError
    CurrentDb.Execute "UPDATE tblRecords SET Status='Borrowed' WHERE RecordID=" & recordID, dbFailOnError
    AuditAction "BORROW_APPROVED", "Approved request for ARMS Ref " & ref
    RefreshRequests
End Sub
Private Sub cmdReject_Click()
    Dim requestID As Long, recordID As Long, ref As String
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    If IsNull(Me.lstRequests) Then MsgBox "Select a pending request.", vbExclamation: Exit Sub
    requestID=CLng(Me.lstRequests.Column(0)): recordID=CLng(Me.lstRequests.Column(1)): ref=CStr(Me.lstRequests.Column(2))
    CurrentDb.Execute "UPDATE tblBorrowRequests SET Status='Rejected',ApprovedBy=" & CLng(TempVars!UserID) & ",ApprovedDate=Now() WHERE RequestID=" & requestID, dbFailOnError
    CurrentDb.Execute "UPDATE tblRecords SET Status='Available' WHERE RecordID=" & recordID, dbFailOnError
    AuditAction "BORROW_REJECTED", "Rejected request for ARMS Ref " & ref
    RefreshRequests
End Sub
Private Sub cmdClose_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmBorrowApproval' 'Pending Borrow Requests' {
        Add-ListBox 'lstRequests' 400 650 12000 3300 '' 7 '0;0;1.7;2.0;2.4;2.2;1.7'
        Add-Button 'cmdApprove' 'Approve / Pull Out' 4400 400 2600
        Add-Button 'cmdReject' 'Reject Request' 4400 3300 2400
        Add-Button 'cmdClose' 'Close' 4400 6000 1800
    } $approvalVba 13000 6000

    $notificationsVba = @'
Private Sub Form_Load()
    RefreshRequests
End Sub
Private Sub RefreshRequests()
    Me.lstMyRequests.RowSource="SELECT b.SeriesNo,r.ARMSRef,b.RequestDate,b.Status,b.ApprovedDate,b.Purpose " & _
        "FROM tblBorrowRequests AS b INNER JOIN tblRecords AS r ON b.RecordID=r.RecordID " & _
        "WHERE b.RequestedBy=" & CLng(TempVars!UserID) & " ORDER BY b.RequestDate DESC;"
    Me.lstMyRequests.Requery
End Sub
Private Sub cmdRefresh_Click(): RefreshRequests: End Sub
Private Sub cmdClose_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmNotifications' 'My Pull-Out Request Updates' {
        Add-Label 'lblNotificationInfo' 'REQUEST STATUS HISTORY' 350 400 6500
        Add-ListBox 'lstMyRequests' 400 800 12600 3600 '' 6 '2.0;1.8;1.6;1.4;1.6;4.0'
        Add-Button 'cmdRefresh' 'Refresh' 4700 400 1800
        Add-Button 'cmdClose' 'Close' 4700 2600 1800
    } $notificationsVba 14000 5800

    $logbookVba = @'
Private Sub Form_Load()
    RefreshLogbook
End Sub
Private Sub RefreshLogbook()
    Me.lstAudit.RowSource="SELECT TOP 250 LoggedAt,[Action],Details,UserID FROM tblAuditLogs ORDER BY LoggedAt DESC;"
    Me.lstAudit.Requery
    Me.lstCounts.RowSource="SELECT TOP 100 RecordDate,Shift,Inbound,Outbound,Scrap,Inventory,RHTemp,RackInspections,MHEPreOps,SubmittedBy FROM tblLogCounts ORDER BY RecordDate DESC;"
    Me.lstCounts.Requery
End Sub
Private Sub cmdRefresh_Click(): RefreshLogbook: End Sub
Private Sub cmdAddRecord_Click(): DoCmd.OpenForm "frmRecordEntry": End Sub
Private Sub cmdNewCount_Click(): DoCmd.OpenForm "frmLogCount": End Sub
Private Sub cmdClose_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmLogbook' 'Logbook / Transaction History' {
        Add-Label 'lblAuditTitle' 'AUDIT AND TRANSACTION HISTORY' 350 400 6000
        Add-ListBox 'lstAudit' 400 800 12600 2600 'SELECT TOP 250 LoggedAt,[Action],Details,UserID FROM tblAuditLogs ORDER BY LoggedAt DESC;' 4 '2.0;2.2;7.0;1.2'
        Add-Label 'lblCountTitle' 'PHYSICAL LOG COUNTS' 3650 400 5000
        Add-ListBox 'lstCounts' 400 4100 12600 2200 'SELECT TOP 100 RecordDate,Shift,Inbound,Outbound,Scrap,Inventory,RHTemp,RackInspections,MHEPreOps,SubmittedBy FROM tblLogCounts ORDER BY RecordDate DESC;' 10 '1.6;1.0;0.8;0.8;0.8;0.8;0.8;1.2;1.2;2.0'
        Add-Button 'cmdRefresh' 'Refresh' 6600 400 1700
        Add-Button 'cmdAddRecord' 'Register Record' 6600 2400 2200
        Add-Button 'cmdNewCount' 'Enter Log Count' 6600 4900 2200
        Add-Button 'cmdClose' 'Close' 6600 7500 1700
    } $logbookVba 14000 7900

    $countVba = @'
Private Sub Form_Load()
    Me.txtDate=Date
End Sub
Private Function DateSql(ByVal value As Variant) As String
    If IsDate(value) Then DateSql="#" & Format$(CDate(value),"yyyy-mm-dd") & "#" Else DateSql="Date()"
End Function
Private Sub cmdSave_Click()
    Dim userID As Long, encoded As Long, submitted As String
    userID=CLng(TempVars!UserID)
    encoded=CLng(Val(Nz(Me.txtInbound,0)))+CLng(Val(Nz(Me.txtOutbound,0)))+CLng(Val(Nz(Me.txtScrap,0)))+CLng(Val(Nz(Me.txtInventory,0)))
    submitted=Nz(DLookup("FullName","tblUsers","UserID=" & userID),"")
    CurrentDb.Execute "INSERT INTO tblLogCounts (RecordDate,Shift,Inbound,Outbound,Scrap,Inventory,RHTemp,RackInspections,MHEPreOps,EncodedCount,SubmittedBy,CustodianID) VALUES (" & _
        DateSql(Me.txtDate) & "," & SqlText(Nz(Me.txtShift,"")) & "," & CLng(Val(Nz(Me.txtInbound,0))) & "," & _
        CLng(Val(Nz(Me.txtOutbound,0))) & "," & CLng(Val(Nz(Me.txtScrap,0))) & "," & CLng(Val(Nz(Me.txtInventory,0))) & "," & _
        CLng(Val(Nz(Me.txtRHTemp,0))) & "," & CLng(Val(Nz(Me.txtRackInspections,0))) & "," & CLng(Val(Nz(Me.txtMHEPreOps,0))) & "," & encoded & "," & SqlText(submitted) & "," & userID & ")", dbFailOnError
    AuditAction "LOG_COUNT", "Recorded physical inventory count " & encoded
    MsgBox "Physical log count recorded.", vbInformation: DoCmd.Close acForm, Me.Name
End Sub
Private Sub cmdCancel_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmLogCount' 'Physical Log Count' {
        Add-TextInput 'txtDate' 'Date (MM/DD/YYYY)' 450
        Add-TextInput 'txtShift' 'Shift' 1000
        Add-TextInput 'txtInbound' 'Inbound count' 1550
        Add-TextInput 'txtOutbound' 'Outbound count' 2100
        Add-TextInput 'txtScrap' 'Scrap count' 2650
        Add-TextInput 'txtInventory' 'Inventory count' 3200
        Add-TextInput 'txtRHTemp' 'RH / temperature checks' 3750
        Add-TextInput 'txtRackInspections' 'Rack inspections' 4300
        Add-TextInput 'txtMHEPreOps' 'MHE pre-ops' 4850
        Add-Button 'cmdSave' 'Save Log Count' 5550 3000 2200
        Add-Button 'cmdCancel' 'Cancel' 5550 5500 1800
    } $countVba 9500 6500

    $reportsVba = @'
Private Sub Form_Load()
    Me.lstStorage.RowSource="SELECT Zone,Shelf,TotalCapacity,OccupiedSlots,OccupancyPercent,CapacityAlert FROM qryStorageUtilization ORDER BY Zone,Shelf;"
    Me.lstStorage.Requery
    Me.cmdExportStorage.Visible=IsManagement()
    Me.cmdAddLocation.Visible=IsManagement()
End Sub
Private Sub cmdOpenStorage_Click(): DoCmd.OpenQuery "qryStorageUtilization", acViewNormal: End Sub
Private Sub cmdOpenRecords_Click(): DoCmd.OpenQuery "qryRecordsReport", acViewNormal: End Sub
Private Sub cmdOpenBorrow_Click(): DoCmd.OpenQuery "qryBorrowReport", acViewNormal: End Sub
Private Sub cmdOpenRetention_Click(): DoCmd.OpenQuery "qryRetentionReport", acViewNormal: End Sub
Private Sub cmdOpenAudit_Click(): DoCmd.OpenQuery "qryAuditReport", acViewNormal: End Sub
Private Sub cmdOpenCompliance_Click(): DoCmd.OpenQuery "qryComplianceReport", acViewNormal: End Sub
Private Sub cmdAddLocation_Click()
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    DoCmd.OpenForm "frmLocationEntry"
End Sub
Private Sub cmdExportStorage_Click()
    Dim path As String
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    path=Environ$("USERPROFILE") & "\Documents\ARMS_StorageUtilization.csv"
    DoCmd.TransferText acExportDelim, , "qryStorageUtilization", path, True
    MsgBox "Storage report exported to " & path, vbInformation
End Sub
Private Sub cmdClose_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmReports' 'Storage Utilization & Reports' {
        Add-Label 'lblStorageTitle' 'CAPACITY BY ZONE AND SHELF' 350 400 6000
        Add-ListBox 'lstStorage' 400 800 12600 2400 'SELECT Zone,Shelf,TotalCapacity,OccupiedSlots,OccupancyPercent,CapacityAlert FROM qryStorageUtilization ORDER BY Zone,Shelf;' 6 '2.1;1.8;1.7;1.7;1.7;3.2'
        Add-Button 'cmdOpenStorage' 'Open Storage Query' 3500 400 2300
        Add-Button 'cmdOpenRecords' 'Records Report' 3500 3000 2100
        Add-Button 'cmdOpenBorrow' 'Borrow Report' 3500 5300 2100
        Add-Button 'cmdOpenRetention' 'Retention Report' 3500 7600 2300
        Add-Button 'cmdOpenAudit' 'Audit Report' 3500 10100 2100
        Add-Button 'cmdOpenCompliance' 'Compliance Report' 4300 400 2500
        Add-Button 'cmdAddLocation' 'Configure Location' 4300 3200 2500
        Add-Button 'cmdExportStorage' 'Export Storage CSV' 5100 400 2500
        Add-Button 'cmdClose' 'Close' 5100 3200 1800
    } $reportsVba 14000 6500

    $locationVba = @'
Private Sub cmdSave_Click()
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    If Len(Trim$(Nz(Me.txtZone,"")))=0 Or Len(Trim$(Nz(Me.txtShelf,"")))=0 Or Len(Trim$(Nz(Me.txtFolder,"")))=0 Then
        MsgBox "Zone, shelf, and folder are required.", vbExclamation: Exit Sub
    End If
    If DCount("*","tblLocations","Zone=" & SqlText(Me.txtZone) & " AND Shelf=" & SqlText(Me.txtShelf) & " AND Folder=" & SqlText(Me.txtFolder))>0 Then
        MsgBox "That storage location already exists.", vbExclamation: Exit Sub
    End If
    CurrentDb.Execute "INSERT INTO tblLocations (Zone,Shelf,Folder,MaxCapacity) VALUES (" & _
        SqlText(Me.txtZone) & "," & SqlText(Me.txtShelf) & "," & SqlText(Me.txtFolder) & "," & CLng(Val(Nz(Me.txtCapacity,1))) & ")", dbFailOnError
    AuditAction "LOCATION_CONFIGURED", "Configured " & Me.txtZone & " / " & Me.txtShelf & " / " & Me.txtFolder
    MsgBox "Storage location saved.", vbInformation: DoCmd.Close acForm, Me.Name
End Sub
Private Sub cmdCancel_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmLocationEntry' 'Configure Storage Location' {
        Add-TextInput 'txtZone' 'Zone' 600
        Add-TextInput 'txtShelf' 'Shelf / cabinet' 1200
        Add-TextInput 'txtFolder' 'Folder' 1800
        Add-TextInput 'txtCapacity' 'Maximum record capacity' 2400
        Add-Button 'cmdSave' 'Save Location' 3300 3000 2200
        Add-Button 'cmdCancel' 'Cancel' 3300 5500 1800
    } $locationVba 9500 4500

    $userVba = @'
Private Sub Form_Load()
    Dim allowed As Boolean
    allowed=IsManagement()
    Me.cboPending.Visible=allowed: Me.cmdApprove.Visible=allowed: Me.cmdReject.Visible=allowed
    Me.lstUsers.RowSource="SELECT UserID,Username,FullName,Role,Status FROM tblUsers ORDER BY Status,Username;"
    Me.lstUsers.Requery
    If allowed Then Me.cboPending.Requery
End Sub
Private Sub cmdApprove_Click()
    Dim userID As Long
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    If IsNull(Me.cboPending) Then MsgBox "Choose a pending registration.", vbExclamation: Exit Sub
    userID=CLng(Me.cboPending): CurrentDb.Execute "UPDATE tblUsers SET Status='approved' WHERE UserID=" & userID, dbFailOnError
    AuditAction "USER_APPROVED", "Approved UserID " & userID: Form_Load
End Sub
Private Sub cmdReject_Click()
    Dim userID As Long
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    If IsNull(Me.cboPending) Then MsgBox "Choose a pending registration.", vbExclamation: Exit Sub
    userID=CLng(Me.cboPending): CurrentDb.Execute "UPDATE tblUsers SET Status='rejected' WHERE UserID=" & userID, dbFailOnError
    AuditAction "USER_REJECTED", "Rejected UserID " & userID: Form_Load
End Sub
Private Sub cmdClose_Click(): DoCmd.Close acForm, Me.Name: End Sub
'@
    Add-NativeForm $Access 'frmUserManagement' 'User Management' {
        Add-Combo 'cboPending' 'Pending registrations' 550 'SELECT UserID,Username & " | " & FullName FROM tblUsers WHERE Status="pending" ORDER BY FullName;'
        Add-Button 'cmdApprove' 'Approve' 1150 3000 1800
        Add-Button 'cmdReject' 'Reject' 1150 5000 1800
        Add-ListBox 'lstUsers' 400 1900 8800 2800 'SELECT UserID,Username,FullName,Role,Status FROM tblUsers ORDER BY Status,Username;' 5 '0.8;1.7;3.2;1.2;1.4'
        Add-Button 'cmdClose' 'Close' 5000 400 1800
    } $userVba 10000 6200
}

function Add-PortalObjects($Access, [string]$TemporaryDirectory) {
    Add-ModuleText $Access 'modAuth' (Get-ModAuthSource) $TemporaryDirectory

    $loginVba = @'
Private Sub cmdLogin_Click()
    Dim rs As DAO.Recordset
    Set rs = CurrentDb.OpenRecordset("SELECT UserID,Role,[Password] FROM tblUsers WHERE Username=" & SqlText(Me.txtUsername) & " AND Status='approved'", dbOpenSnapshot)
    If rs.EOF Then
        MsgBox "Invalid credentials or account awaiting approval.", vbExclamation, "ARMS Sign In"
    ElseIf Not VerifyPassword(Nz(Me.txtPassword,""), Nz(rs![Password],"")) Then
        MsgBox "Invalid credentials or account awaiting approval.", vbExclamation, "ARMS Sign In"
    Else
        StartSession rs!UserID, rs!Role: AuditAction "LOGIN", "User signed in"
        DoCmd.OpenForm "frmMain": DoCmd.Close acForm, Me.Name
    End If
    rs.Close: Set rs = Nothing
End Sub
Private Sub cmdRegister_Click()
    DoCmd.OpenForm "frmRegister"
End Sub
'@
    Add-NativeForm $Access 'frmLogin' 'ARMS Local Login' {
        Add-Label 'lblTitle' 'ARMS | Local Archive Portal' 350 400 5800
        Add-TextInput 'txtUsername' 'Username' 1300
        Add-TextInput 'txtPassword' 'Password' 2300 -Password
        Add-Button 'cmdLogin' 'Sign In' 3300
        Add-Button 'cmdRegister' 'Register Account' 4100 3500 3000
    } $loginVba

    $registerVba = @'
Private Sub cmdSubmit_Click()
    If Len(Nz(Me.txtFullName,""))=0 Or Len(Nz(Me.txtUsername,""))=0 Or Len(Nz(Me.txtPassword,""))<12 Then
        MsgBox "Name, username, and a password of at least 12 characters are required.", vbExclamation: Exit Sub
    End If
    If DCount("*","tblUsers","Username=" & SqlText(Me.txtUsername))>0 Then MsgBox "That username is already in use.", vbExclamation: Exit Sub
    CurrentDb.Execute "INSERT INTO tblUsers (FullName,Department,Username,[Password],Role,Status) VALUES (" & _
        SqlText(Me.txtFullName) & "," & SqlText(Nz(Me.txtDepartment,"")) & "," & SqlText(Me.txtUsername) & "," & _
        SqlText(HashPassword(Me.txtPassword)) & ",'custodian','pending')", dbFailOnError
    MsgBox "Registration submitted for Management approval.", vbInformation
    DoCmd.Close acForm, Me.Name
End Sub
'@
    Add-NativeForm $Access 'frmRegister' 'ARMS Account Registration' {
        Add-Label 'lblTitle' 'Request local account access' 350 400 5800
        Add-TextInput 'txtFullName' 'Full Name' 1100
        Add-TextInput 'txtDepartment' 'Department' 1900
        Add-TextInput 'txtUsername' 'Username' 2700
        Add-TextInput 'txtPassword' 'Password (12+ characters)' 3500 -Password
        Add-Button 'cmdSubmit' 'Submit for Approval' 4500 600 3000
    } $registerVba

    $mainVba = @'
Private Sub Form_Load()
    Dim isManagement As Boolean
    Dim capacity As Double, inUse As Double
    isManagement = IsManagement()
    DoCmd.Maximize
    Me.lblWelcome.Caption = "Signed in as " & Nz(DLookup("FullName","tblUsers","UserID=" & CLng(TempVars!UserID)),"")
    Me.lblTotal.Caption = "TOTAL RECORDS  " & Format(DCount("*","tblRecords"),"#,##0")
    Me.lblAvailable.Caption = "AVAILABLE  " & Format(DCount("*","tblRecords","Status='Available'"),"#,##0")
    Me.lblBorrowed.Caption = "PULLED OUT  " & Format(DCount("*","tblRecords","Status='Borrowed'"),"#,##0")
    Me.lblPendingBorrow.Caption = "PENDING BORROW  " & Format(DCount("*","tblBorrowRequests","Status='Pending'"),"#,##0")
    Me.lblPendingUsers.Caption = "PENDING USERS  " & Format(DCount("*","tblUsers","Status='pending'"),"#,##0")
    capacity = Nz(DSum("MaxCapacity","tblLocations"),0)
    inUse = DCount("*","tblRecords","Status<>'Borrowed'")
    Me.lblStorage.Caption = "STORAGE UTILIZATION  " & Format(IIf(capacity=0,0,inUse/capacity),"0.0%")
    Me.cboPendingUser.Visible = isManagement
    Me.cmdApproveUser.Visible = isManagement: Me.cmdRejectUser.Visible = isManagement
    Me.cmdBorrowApproval.Visible = isManagement: Me.cmdUserManagement.Visible = isManagement
    If isManagement Then Me.cboPendingUser.Requery
    Me.lstRecentActivity.RowSource = "SELECT TOP 8 LoggedAt,[Action],Details FROM tblAuditLogs ORDER BY LoggedAt DESC;"
    Me.lstRecentActivity.Requery
End Sub
Private Sub cmdApproveUser_Click()
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    If IsNull(Me.cboPendingUser) Then MsgBox "Select a pending registration.", vbExclamation: Exit Sub
    CurrentDb.Execute "UPDATE tblUsers SET Status='approved' WHERE UserID=" & CLng(Me.cboPendingUser), dbFailOnError
    AuditAction "USER_APPROVED", "Approved UserID " & CLng(Me.cboPendingUser)
    Me.cboPendingUser.Requery: Me.cboPendingUser = Null: Form_Load
End Sub
Private Sub cmdRejectUser_Click()
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    If IsNull(Me.cboPendingUser) Then MsgBox "Select a pending registration.", vbExclamation: Exit Sub
    CurrentDb.Execute "UPDATE tblUsers SET Status='rejected' WHERE UserID=" & CLng(Me.cboPendingUser), dbFailOnError
    AuditAction "USER_REJECTED", "Rejected UserID " & CLng(Me.cboPendingUser)
    Me.cboPendingUser.Requery: Me.cboPendingUser = Null: Form_Load
End Sub
Private Sub cmdFindFile_Click(): DoCmd.OpenForm "frmFindFile": End Sub
Private Sub cmdNewRecord_Click(): DoCmd.OpenForm "frmRecordEntry": End Sub
Private Sub cmdBorrowRequest_Click(): DoCmd.OpenForm "frmBorrowRequest": End Sub
Private Sub cmdBorrowApproval_Click()
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    DoCmd.OpenForm "frmBorrowApproval"
End Sub
Private Sub cmdLogbook_Click(): DoCmd.OpenForm "frmLogbook": End Sub
Private Sub cmdLogCount_Click(): DoCmd.OpenForm "frmLogCount": End Sub
Private Sub cmdReports_Click(): DoCmd.OpenForm "frmReports": End Sub
Private Sub cmdNotifications_Click(): DoCmd.OpenForm "frmNotifications": End Sub
Private Sub cmdUserManagement_Click()
    If Not IsManagement() Then MsgBox "Management role required.", vbCritical: Exit Sub
    DoCmd.OpenForm "frmUserManagement"
End Sub
Private Sub cmdLogout_Click()
    AuditAction "LOGOUT", "User signed out"
    On Error Resume Next: TempVars.Remove "UserID": TempVars.Remove "Role": On Error GoTo 0
    DoCmd.OpenForm "frmLogin": DoCmd.Close acForm, Me.Name
End Sub
'@
    Add-NativeForm $Access 'frmMain' 'ARMS Main Dashboard' {
        Add-Label 'lblWelcome' 'ARMS ARCHIVE DASHBOARD' 250 400 10000
        Add-Label 'lblTotal' 'TOTAL RECORDS  0' 750 300 2050
        Add-Label 'lblAvailable' 'ACTIVE / AVAILABLE  0' 750 2500 2050
        Add-Label 'lblBorrowed' 'PULLED OUT  0' 750 4700 2050
        Add-Label 'lblPendingBorrow' 'PENDING BORROW  0' 750 6900 2050
        Add-Label 'lblPendingUsers' 'PENDING USERS  0' 750 9100 2050
        Add-Label 'lblStorage' 'STORAGE UTILIZATION  0%' 750 11300 2450
        Add-Combo 'cboPendingUser' 'Pending user registrations (Management)' 1450 'SELECT UserID,Username & " | " & FullName FROM tblUsers WHERE Status="pending" ORDER BY FullName;'
        Add-Button 'cmdApproveUser' 'Approve User' 2050 3000 1900
        Add-Button 'cmdRejectUser' 'Reject User' 2050 5000 1900
        Add-ListBox 'lstRecentActivity' 400 2650 13000 1550 'SELECT TOP 8 LoggedAt,[Action],Details FROM tblAuditLogs ORDER BY LoggedAt DESC;' 3 '1.7;2.2;8.5'
        Add-Button 'cmdFindFile' 'Find File' 4700 400 2300
        Add-Button 'cmdNewRecord' 'Register Record' 4700 3000 2300
        Add-Button 'cmdBorrowRequest' 'Pull-Out Request' 4700 5600 2300
        Add-Button 'cmdBorrowApproval' 'Approve Requests' 4700 8200 2300
        Add-Button 'cmdLogbook' 'Logbook / Audit' 4700 10800 2300
        Add-Button 'cmdLogCount' 'Physical Log Count' 5500 400 2300
        Add-Button 'cmdReports' 'Storage & Reports' 5500 3000 2300
        Add-Button 'cmdUserManagement' 'User Management' 5500 5600 2300
        Add-Button 'cmdLogout' 'Sign Out' 5500 8200 2300
        Add-Button 'cmdNotifications' 'My Request Updates' 6300 400 2600
    } $mainVba 14000 9000

    Add-WorkflowForms $Access

    $macroText = @'
Version =196611
ColumnsShown =0
Begin Action
    Name ="OpenForm"
    Argument ="frmLogin"
    Argument ="0"
    Argument =""
    Argument =""
    Argument ="0"
    Argument ="0"
End
'@
    $macroPath = Join-Path $TemporaryDirectory 'AutoExec.txt'
    [IO.File]::WriteAllText($macroPath, $macroText, [System.Text.Encoding]::Unicode)
    $Access.LoadFromText($script:AcMacro, 'AutoExec', $macroPath)
}

function Backup-IfPresent([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        if (-not $Force) { throw "'$Path' exists. Use -Force to back it up before rebuilding." }
        $backupPath = "$Path.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
        Copy-Item -LiteralPath $Path -Destination $backupPath
        Remove-Item -LiteralPath $Path -Force
        Write-Host "Existing file backed up to $backupPath" -ForegroundColor Yellow
    }
}

function New-Frontend([string]$Path, [string]$BackendPath) {
    $engine = New-Object -ComObject DAO.DBEngine.120
    $database = $null; $access = $null
    $tempDirectory = Join-Path ([IO.Path]::GetTempPath()) ("ARMS-Access-{0}" -f [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tempDirectory -Force | Out-Null
    try {
        $database = $engine.CreateDatabase($Path, ';LANGID=0x0409;CP=1252;COUNTRY=0')
        Add-LinkedTables $database $BackendPath; Add-StorageQuery $database
        $database.Close(); Release-Com $database; $database = $null
        $access = New-Object -ComObject Access.Application
        $access.OpenCurrentDatabase($Path)
        Add-PortalObjects $access $tempDirectory
        $access.CloseCurrentDatabase(); $access.Quit()
    }
    finally {
        if ($null -ne $access) { try { $access.Quit() } catch {}; Release-Com $access }
        if ($null -ne $database) { try { $database.Close() } catch {}; Release-Com $database }
        Release-Com $engine
        Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'This builder requires Windows desktop Microsoft Access.' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
if (-not (Test-Path -LiteralPath $OutputDirectory)) { New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null }
$bePath = Join-Path $OutputDirectory 'ARMS_BE.accdb'
$fePath = Join-Path $OutputDirectory 'ARMS_FE.accdb'
$dao = $null; $probe = $null
try {
    $dao = New-Object -ComObject DAO.DBEngine.120
    $probe = New-Object -ComObject Access.Application
    $probe.Quit()
}
catch { throw "Access COM setup failed. Install desktop Microsoft Access with DAO.DBEngine.120. Details: $($_.Exception.Message)" }
finally {
    if ($null -ne $probe) { try { $probe.Quit() } catch {}; Release-Com $probe }
    Release-Com $dao
}

$users = Get-SeedUsers
Backup-IfPresent $fePath; Backup-IfPresent $bePath
try {
    New-Backend $bePath $users
    New-Frontend $fePath $bePath
    Write-Host "Created split ARMS Access files:`n  $bePath`n  $fePath" -ForegroundColor Green
    Write-Host 'Management and Custodian users and Zone A-D starter shelves are present. Records and logs are empty.'
    Write-Host 'Password values are salted PBKDF2-SHA256 hashes. Protect the back-end file with Windows share and NTFS permissions.' -ForegroundColor Yellow
}
finally { foreach ($user in $users) { $user.PasswordHash = $null } }

