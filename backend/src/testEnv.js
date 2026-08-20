/**
 * Ensures JWT_SECRET exists for the test suite (no silent auth.js fallback).
 * Loaded via: node --import ./src/testEnv.js --test …
 */
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'kindplate-test-secret-not-for-production';
}
