# ARMS On-Premise Archive Portal

ARMS runs as a local Node.js web server with an SQLite database. Production serves the React UI and JSON API from the same host, with no remote services, cloud storage, external fonts, or third-party runtime APIs.

## Requirements

- Node.js 22.13 or newer (uses Node's built-in SQLite driver)
- Windows, Linux, or macOS host with a fixed/reachable LAN address
- Internal firewall access to TCP port 3000 for authorized desktop clients

## First-time setup

```powershell
npm install
npm run setup:users
npm run start
```

The setup command interactively creates one `management` and one `custodian` account if those roles do not already exist. It asks for passwords (12 or more characters) without storing credentials in source. It creates no records, log entries, or sample data. The database is created at `./data/arms.db` by default. An administrator can reset a local account password with `npm run reset:user -- management` or `npm run reset:user -- custodian`.

For a database on an approved internal path, set `DATABASE_PATH` before setup and start. PowerShell example:

```powershell
$env:DATABASE_PATH = 'D:\ARMS-Data\arms.db'
npm run setup:users
npm run start
```

Alternatively, copy `.env.example` to `.env` and configure the local settings there. Node loads that file at server startup.

SQLite database files on network shares require reliable file locking. Prefer local host storage for the active database; have internal IT validate any shared path and provide backups.

## LAN access

`npm run start` builds the client and binds the portal to `0.0.0.0:3000`. On each authorized desktop, open:

```text
http://<HOST-PC-IP>:3000
```

Configure the host firewall to allow port 3000 only from the internal network segments that should access ARMS. For deployments requiring encrypted traffic, terminate TLS on an internally managed reverse proxy and keep the app server bound to the host.

## Development

Run `npm run server` in one terminal and `npm run dev` in another. Vite proxies `/api` requests to the local API on port 3000.

## Local data and governance

The server initializes `users`, `sessions`, `records`, `record_batches`, `log_counts`, `borrow_requests`, `notifications`, `activity_logs`, and `storage_locations`. Management controls approval and storage capacity configuration. Record registration stores the assigned custodian and configured folder capacity. Reports calculate utilization, the 85% expansion alert, retention review candidates, and encoding entries from SQLite data.

All user passwords are bcrypt-hashed. Authentication uses opaque server-side sessions in SQLite and an HTTP-only SameSite cookie. There is no password email recovery; contact the local ARMS administrator for account recovery.
