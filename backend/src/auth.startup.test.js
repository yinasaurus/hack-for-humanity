import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, 'index.js');

describe('JWT_SECRET startup', () => {
  it('refuses to start when JWT_SECRET is missing', () => {
    // Empty string stays set so dotenv will not fill from backend/.env
    const env = { ...process.env, JWT_SECRET: '' };

    const result = spawnSync(process.execPath, [indexPath], {
      env,
      encoding: 'utf8',
      timeout: 5000,
      cwd: path.join(__dirname, '..'),
    });

    assert.notEqual(result.status, 0);
    const combined = `${result.stderr || ''}\n${result.stdout || ''}`;
    assert.match(combined, /JWT_SECRET is required/);
  });
});
