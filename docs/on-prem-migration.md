# ARMS on-premise migration design

## Confirmed scope

- Replace hosted Supabase authentication, database, and realtime services with a local Node application server and SQLite.
- Keep the React portal and its API on the same LAN origin, bound to `0.0.0.0:3000`.
- Store the SQLite file at `./data/arms.db` by default, configurable through `DATABASE_PATH`.
- Provide local management and custodian accounts through a one-time interactive bootstrap, with no example records or logs.
- Support records and batches, log counts, borrow requests, notifications, activity logs, storage locations, search, approval/return workflows, and storage utilization reporting.

## Assumptions

- One designated host runs the app and owns the SQLite database; desktops use the portal over the internal LAN.
- Internal IT manages host hardening, HTTPS termination where required, backups, and firewall access.
- SQLite is the default for a modest team. A network share path is configurable, but its SQLite locking behavior must be validated before concurrent multi-user use.
- No cloud synchronization, external storage, analytics, fonts, or other external runtime calls are permitted.

## Architecture decisions

1. **Server:** Express serves the production Vite build and same-origin `/api` routes. Vite proxies `/api` during development.
2. **Database:** Node's built-in SQLite driver, parameterized SQL, foreign keys, explicit transactions, and startup schema creation. Database path comes from `DATABASE_PATH` (Node 22.5 or newer).
3. **Authentication:** bcryptjs password hashes, random opaque server-side sessions, and HTTP-only SameSite cookies. Management-only operations are authorized on the server.
4. **Users:** A one-time interactive bootstrap creates management and custodian users only if absent. Passwords are never checked into source or seeded.
5. **Collaboration:** Data is authoritative on the server; clients refresh after writes and poll for updates. Active sessions are derived from local session heartbeat timestamps.
6. **Storage governance:** Shelf capacities and hierarchical locations are persisted. Utilization and retention recommendations derive from current database records.

## Alternatives considered

- Prisma + SQLite offers generated client types and migration tooling but adds setup and runtime complexity for this app.
- A desktop-embedded database would make the shared authoritative dataset and LAN collaboration harder.
- A remote database server could improve network-filesystem concurrency, but conflicts with the requested local SQLite architecture.

## Operational risks

SQLite on a network filesystem relies on filesystem locking semantics. Prefer host-local storage for the live database and use an approved internal backup target. The server process and host are single points of availability; backups and recovery procedures belong to internal IT.
