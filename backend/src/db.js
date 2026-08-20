import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'store.json');

const defaultDb = () => ({
  users: [],
  checkIns: [],
  unlocks: {},
  analyses: {},
  summaries: {},
  alerts: [],
  clinicianNotes: {},
  /** Clinician-logged checkup attendance celebrations (date + optional note only). */
  checkupCelebrations: {},
  /** Clinician-scheduled patient reminders (note + frequency; not AI-parsed). */
  clinicianReminders: {},
});

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb(), null, 2));
  }
}

export function readDb() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

export function writeDb(db) {
  ensureStore();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function updateDb(mutator) {
  const db = readDb();
  mutator(db);
  writeDb(db);
  return db;
}

export { DATA_DIR };
