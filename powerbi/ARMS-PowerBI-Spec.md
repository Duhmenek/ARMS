# ARMS Power BI specification

## Data sources

The sync script creates one Access table per SQLite table, prefixed with `web_` (for example, `web_records`, `web_storage_locations`, and `web_borrow_requests`). It refreshes those snapshots on every run while retaining the legacy Access tables (`tblRecords`, `tblLocations`, etc.) for existing Access workflows. Run `scripts\sync-sqlite-to-access.ps1` before refreshing the Power BI dataset. Close Access users/connections during the refresh to avoid file locks.

In Power BI Desktop, select **Get data > Access database** and choose `C:\Users\Administrator\arms-app\access\ARMS_BE.accdb`. Load the `web_*` tables for current app data, plus legacy `tbl*` tables if their independently maintained Access records should be included. Where both sources represent the same archive, append/deduplicate by ARMS reference before using the measures below.

### Power Query M connection

```powerquery
let
    Source = Access.Database(
        File.Contents("C:\Users\Administrator\arms-app\access\ARMS_BE.accdb"),
        [CreateNavigationProperties = true]
    ),
    WebRecords = Source{[Schema = "", Item = "web_records"]}[Data],
    WebRequests = Source{[Schema = "", Item = "web_borrow_requests"]}[Data],
    WebLocations = Source{[Schema = "", Item = "web_storage_locations"]}[Data]
in
    WebRecords
```

This query returns records. To import requests or locations separately, duplicate it and use `WebRequests` or `WebLocations` as the final expression. Power Query may expose Access navigation fields as `Item` and `Kind`; if so, select the corresponding `web_*` row through the Navigator and keep the generated navigation step.

## Model assumptions

Use `web_records` as the `Records` table, `web_borrow_requests` as `Borrow Requests`, `web_storage_locations` as `Storage Locations`, and `web_log_counts` as `Log Counts`. Create one-to-many relationships from `Storage Locations[id]` to `Records[location_id]`, and from `Records[id]` to `Borrow Requests[record_id]`. Set `Records[id]`, `Storage Locations[id]`, and `Borrow Requests[id]` to **Text** in the model. The measures assume records are one row per archive record and capacity is the sum of location `max_capacity`.

## DAX measures

Create these measures in the `Records` table (or a dedicated measures table). Names and expressions are exact for the stated model.

```DAX
Total Records =
COUNTROWS ( 'Records' )

Available Records =
CALCULATE ( [Total Records], 'Records'[status] = "Available" )

Pulled Out Records =
CALCULATE ( [Total Records], 'Records'[status] = "Borrowed" )

Pending Borrow Requests =
CALCULATE (
    COUNTROWS ( 'Borrow Requests' ),
    'Borrow Requests'[status] = "Pending"
)

Overdue Requests =
CALCULATE (
    COUNTROWS ( 'Borrow Requests' ),
    'Borrow Requests'[status] = "Approved",
    NOT ISBLANK ( 'Borrow Requests'[request_date] ),
    'Borrow Requests'[request_date] < TODAY ()
)

Storage Utilization % =
VAR StoredRecords =
    CALCULATE (
        [Total Records],
        'Records'[status] IN { "Available", "Borrowed", "Pending" }
    )
VAR TotalCapacity =
    SUM ( 'Storage Locations'[max_capacity] )
RETURN
    DIVIDE ( StoredRecords, TotalCapacity, 0 )

Count Variance =
SUM ( 'Log Counts'[inbound] )
    - SUM ( 'Log Counts'[outbound] )
    - SUM ( 'Log Counts'[scrap] )
```

Format `Storage Utilization %` as Percentage. `Overdue Requests` uses the request date as the due date because the current app schema has no separate due-date field; replace that predicate with your approved due-date column when one is added. `Count Variance` is cumulative inbound less outbound and scrap; it does not compare against a separately stored physical stock baseline.

## Theme

Import `arms-theme.json` through **View > Themes > Browse for themes**. The Executive Slate colors are designed for a restrained operations dashboard: deep navy, slate, cool blue, and teal, with amber and red for attention states.
