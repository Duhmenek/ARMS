# Archive Room Management System (ARMS)
### Adsia Logistics, Inc. · Central Warehouse Archive Vault

A responsive, production-ready web application built for **Adsia Logistics, Inc.** to digitize physical archive management, publication log books, chain-of-custody tracking, and Nestlé compliance audits.

---

## 🚀 Live Access
- **Local URL**: `http://localhost:3000/`
- **Network Access**: Check console output for LAN IP (e.g., `http://192.168.2.77:3000/`)

---

## 🎨 Visual Design & Theme
- **Primary Gradient**: Deep Forest Green (`#0A5C1D` to `#1B8A2F`)
- **Card Surfaces**: Crisp White (`#FFFFFF`) with subtle border shadows
- **Background**: Soft Gray (`#F4F6F5`)
- **Action Buttons**: Charcoal / Dark (`#222222`)
- **Accents**: Light Forest Green progress bars & highlights (`#A8E0A8`)
- **Brand Mark**: Lowercase bold `arms.` in sidebar and login screen
- **Typography**: Bold condensed uppercase headers (*Barlow Condensed* / *Oswald*) paired with clean sans-serif body (*Inter*)

---

## 🔑 Demo Authentication & Roles
One-click demo switchers are built into the Login screen, Top Header, and Notifications view:
1. **Jose Rizal** (`j.rizal@adsialogistics.com`) — **Archive Custodian**
   - Can encode records, log daily counts, search archive, and submit borrow requests.
2. **Juan Luna** (`j.luna@adsialogistics.com`) — **Management Admin / Operations Head**
   - Full management privileges. Can **Approve** or **Reject** pending borrow requests in Notifications, update custody status to *Borrowed*, and manage retention disposal schedules.
3. **Maria Clara** (`m.clara@adsialogistics.com`) — **Lead Load Planner & Encoder**
   - Inbound / Outbound publication and batch tracking.

---

## 📦 Key Functional Modules

### 1. Dashboard View
- **4 Top KPI Cards**:
  - `TRANSACTIONS`: 1,205 active files (+10 this week)
  - `PENDING FOR LOG`: 120 files requiring organization (-20 this week)
  - `BORROWED`: 10 files in circulation (+15 this week)
  - `ACTIVE USERS`: 15 staff in scope (-1 this week)
- **Activity (7 Days) Chart**: Interactive SVG grouped bar + smooth line chart comparing uploads vs borrows with hover tooltips (e.g., `72 transactions · 10 borrows`).
- **Documents by Category**: Interactive Donut chart (Outbound 37%, Inbound 21%, Scrap 18%, Inventory 16%, Others 8%).
- **Documents by Transaction**: Horizontal gradient progress bars for operational flows.
- **Recent Activity Feed**: Real-time chronological audit trail of uploads, borrows, and returns.
- **Active Users**: Shift attendance list with online indicators.

### 2. Publication Log Book
- **Top Action Buttons**: `Log Count` and `+ Publish Form` (Dark charcoal buttons).
- **Encoding Form**:
  - Select Transaction (Receiving of IFT, Inbound, Dispatch of local resupply, Scrap, Cycle count).
  - Material Document, Delivery/PO, GR Date, Material Number, Vendor Site, VAM, Freight Order, Packages, Operator, Encoder, Checker, Plate Number.
  - **Storage Location Mapping**: Interactive Zone -> Shelf -> Folder selector with computed rack code (e.g. `A01`, `B02`).
  - **Dynamic Repeatable Line Items**: Add/delete line rows (`+` add / green trash delete) with Batch Code, Prod Date, Exp Date/SLED, and Quantity.
  - **Auto-Fill Sample**: 1-click pre-fill with realistic Nestlé Lipa shipment details.
- **Publish Action**: Validates, generates unique ARMS Reference (`IB2026-IFT001`), and displays confirmation modal with copy reference and quick view.
- **Log Count Modal**: Daily shift tallies for Inbound, Outbound, Scrap, Inventory Count, RH/Temp monitoring, Rack inspections, and MHE pre-ops.

### 3. Find File (Search & Inventory)
- **Control Bar**: Show 5/10/25/50 entries, live search, multi-faceted filters (Transaction Type, Status, Retention Alert), and `+ Pull Out Form` button.
- **Data Table**: Columns for ARMS Ref, Location Code & Shelf, Transaction Type, Record Date, Custodian, Retention Expiry Badge, and Status (`Available` in dark text, `Borrowed` in red text, `Pending` in amber).
- **Record Details Drawer**: Inspect complete metadata, line items, and audit history. Includes **Check-In / Return** button for borrowed files.
- **Pull Out Form Modal**: Requisition slip capturing Family Name, Given Name, Designation, and Purpose dropdown (`Nestle Internal Audit`, `Incident Investigation`, `Internal Market SHE Audit`, `Halal Audit`, `Nestle Customer Audit`).
  - On submit, assigns `Transaction Series 2026-XXX` and displays approval pending notice.

### 4. Notifications & Approval Workflow
- Checkbox select-all, "Mark as read", search bar, and filter tabs (All, Pending Approval, Approved, Starred).
- Notification list with bookmarking and right-aligned `Transaction Series 2026-XXX`.
- **Management Approval**: Admin users have inline **Approve** and **Reject** buttons. Approving updates the file to *Borrowed*, increments Dashboard KPIs, and registers approval.

### 5. Download Reports & Lifecycle Compliance
- Date Range filter (`DD MM YYYY` to `DD MM YYYY`) and **Export CSV** action.
- **2x2 Report Cards Grid**:
  1. *Borrow Reports* (circulation logs, borrower history, overdue items)
  2. *Retention Reports* (active vs semi-active records, disposal alerts)
  3. *On-Time Encoding Compliance* (turnaround metrics vs SLA targets)
  4. *Document Reports* (master repository by category, location, and transaction)
- Real downloadable formatted `.csv` files for spreadsheets and external audits.

---

## 🛠️ Development & Build
```bash
# Navigate to directory
cd arms-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```
