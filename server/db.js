import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const configuredPath = process.env.DATABASE_PATH || './data/arms.db';
const databasePath = path.resolve(configuredPath);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new DatabaseSync(databasePath);
sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = DELETE;');
export const db = {
  exec: sql => sqlite.exec(sql),
  prepare: sql => sqlite.prepare(sql),
  close: () => sqlite.close(),
  transaction: fn => () => {
    sqlite.exec('BEGIN IMMEDIATE');
    try { const result=fn(); sqlite.exec('COMMIT'); return result; }
    catch(error) { sqlite.exec('ROLLBACK'); throw error; }
  },
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('management','custodian')),
  role_title TEXT NOT NULL, department TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS storage_locations (
  id TEXT PRIMARY KEY, zone TEXT NOT NULL, shelf TEXT NOT NULL, folder TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 1 CHECK(max_capacity > 0),
  UNIQUE(zone,shelf,folder)
);
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY, arms_ref TEXT NOT NULL UNIQUE, transaction_type TEXT NOT NULL,
  material_doc TEXT NOT NULL DEFAULT '', delivery_po TEXT NOT NULL DEFAULT '', gr_date TEXT NOT NULL DEFAULT '',
  material_number TEXT NOT NULL DEFAULT '', vendor_site_number TEXT NOT NULL DEFAULT '', vam_number TEXT NOT NULL DEFAULT '',
  freight_order TEXT NOT NULL DEFAULT '', num_packages INTEGER NOT NULL DEFAULT 0,
  operator TEXT NOT NULL DEFAULT '', encoder TEXT NOT NULL DEFAULT '', checker TEXT NOT NULL DEFAULT '', plate_number TEXT NOT NULL DEFAULT '',
  location_id TEXT REFERENCES storage_locations(id), location_code TEXT NOT NULL DEFAULT '',
  retention_date TEXT NOT NULL DEFAULT '', retention_status TEXT NOT NULL DEFAULT 'Active', remarks TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','Borrowed','Pending')),
  assigned_custodian TEXT NOT NULL DEFAULT '', custodian TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS records_search ON records(arms_ref,transaction_type,status,gr_date);
CREATE TABLE IF NOT EXISTS record_batches (
  id TEXT PRIMARY KEY, record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  batch_code TEXT NOT NULL DEFAULT '', prod_date TEXT NOT NULL DEFAULT '', exp_date TEXT NOT NULL DEFAULT '', quantity TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS log_counts (
  id TEXT PRIMARY KEY, date TEXT NOT NULL, inbound INTEGER NOT NULL DEFAULT 0, outbound INTEGER NOT NULL DEFAULT 0,
  scrap INTEGER NOT NULL DEFAULT 0, inventory INTEGER NOT NULL DEFAULT 0, rh_temp INTEGER NOT NULL DEFAULT 0,
  rack_inspections INTEGER NOT NULL DEFAULT 0, mhe_pre_ops INTEGER NOT NULL DEFAULT 0,
  submitted_by TEXT NOT NULL, user_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS log_entries (
  id TEXT PRIMARY KEY, unique_code TEXT NOT NULL UNIQUE,
  transaction_type TEXT NOT NULL, material_document TEXT NOT NULL DEFAULT '',
  po TEXT NOT NULL DEFAULT '', material_number TEXT NOT NULL DEFAULT '',
  operator TEXT NOT NULL DEFAULT '', gr_date TEXT NOT NULL DEFAULT '',
  vam_number TEXT NOT NULL DEFAULT '', plate_number TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS borrow_requests (
  id TEXT PRIMARY KEY, transaction_series TEXT NOT NULL UNIQUE, arms_ref TEXT NOT NULL,
  record_id TEXT REFERENCES records(id) ON DELETE SET NULL, family_name TEXT NOT NULL, given_name TEXT NOT NULL,
  designation TEXT NOT NULL, purpose TEXT NOT NULL, request_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected','Returned')),
  approved_by TEXT, approved_by_id TEXT REFERENCES users(id), approved_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, transaction_series TEXT NOT NULL DEFAULT '',
  arms_ref TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Pending', is_read INTEGER NOT NULL DEFAULT 0,
  is_starred INTEGER NOT NULL DEFAULT 0, borrow_request_id TEXT REFERENCES borrow_requests(id) ON DELETE CASCADE,
  borrower_name TEXT, designation TEXT, purpose TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
  arms_ref TEXT, user_name TEXT NOT NULL, user_email TEXT, user_id TEXT REFERENCES users(id),
  status_badge TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Add the receiving/delivery inspection fields to existing log_entries tables.
// Existing rows and unique codes are preserved; newly added fields start empty.
const logEntryColumnMigrations = {
  material_description: "TEXT NOT NULL DEFAULT ''",
  dr_inv_number: "TEXT NOT NULL DEFAULT ''",
  pro_number: "TEXT NOT NULL DEFAULT ''",
  material_condition: "TEXT NOT NULL DEFAULT ''",
  truck_cv_condition: "TEXT NOT NULL DEFAULT ''",
  no_infestation: "TEXT NOT NULL DEFAULT ''",
  truck_cv_odor: "TEXT NOT NULL DEFAULT ''",
  truck_cv_seal: "TEXT NOT NULL DEFAULT ''",
  gate_in: "TEXT NOT NULL DEFAULT ''",
  unloading_start: "TEXT NOT NULL DEFAULT ''",
  unloading_end: "TEXT NOT NULL DEFAULT ''",
  dwell_minutes: 'INTEGER',
};
const existingLogEntryColumns = new Set(sqlite.prepare('PRAGMA table_info(log_entries)').all().map(column => column.name));
for (const [name, definition] of Object.entries(logEntryColumnMigrations)) {
  if (!existingLogEntryColumns.has(name)) sqlite.exec(`ALTER TABLE log_entries ADD COLUMN ${name} ${definition}`);
}

const networkPath = /^\\\\|^\/\//.test(configuredPath);
if (networkPath) console.warn('DATABASE_PATH points to a network share. Verify SQLite locking support; host-local storage is recommended.');
console.log(`ARMS SQLite database: ${databasePath}`);
