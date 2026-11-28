'use strict';

const { DatabaseSync } = require('node:sqlite');

const databasePath = process.argv[2];
if (!databasePath) {
  console.error('Usage: node export-sqlite-json.cjs <database-path>');
  process.exitCode = 2;
} else {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    db.exec('PRAGMA busy_timeout=10000');
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();

    const result = tables.map(({ name }) => {
      const quotedName = `"${name.replace(/"/g, '""')}"`;
      return {
        name,
        columns: db.prepare(`PRAGMA table_info(${quotedName})`).all()
          .map(column => ({ name: column.name, type: column.type })),
        rows: db.prepare(`SELECT * FROM ${quotedName}`).all(),
      };
    });

    process.stdout.write(JSON.stringify({ tables: result }));
  } finally {
    db.close();
  }
}
