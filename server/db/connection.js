import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dbDir = isVercel ? '/tmp/vyaparx-data' : path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'vyaparx.db');

// If on Vercel and /tmp database does not exist yet, copy bundled database if available
const bundledDbPath = path.resolve(__dirname, '../../data/vyaparx.db');
if (isVercel && !fs.existsSync(dbPath) && fs.existsSync(bundledDbPath)) {
  try {
    fs.copyFileSync(bundledDbPath, dbPath);
  } catch (copyErr) {
    console.warn('Notice: Could not copy bundled database file:', copyErr.message);
  }
}

const db = new DatabaseSync(dbPath);

// Enable foreign keys and appropriate journal mode for reliability
db.exec('PRAGMA foreign_keys = ON;');
if (!isVercel) {
  db.exec('PRAGMA journal_mode = WAL;');
} else {
  db.exec('PRAGMA journal_mode = MEMORY;');
}

// Initialize schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Enhanced query wrappers for ease of use
export const getDb = () => db;

const sanitizeParams = (params) => {
  if (!Array.isArray(params)) return [];
  return params.map(p => p === undefined ? null : p);
};

export const queryAll = (sql, params = []) => {
  const stmt = db.prepare(sql);
  return stmt.all(...sanitizeParams(params));
};

export const queryOne = (sql, params = []) => {
  const stmt = db.prepare(sql);
  return stmt.get(...sanitizeParams(params));
};

export const run = (sql, params = []) => {
  const stmt = db.prepare(sql);
  return stmt.run(...sanitizeParams(params));
};

export const transaction = (callback) => {
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const result = callback();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
};

export default {
  db,
  getDb,
  queryAll,
  queryOne,
  run,
  transaction,
};
