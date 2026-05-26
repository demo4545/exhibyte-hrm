#!/usr/bin/env node
/**
 * Generate a bcrypt hash for a password (paste into the sheet Password column).
 *
 * Usage: node scripts/hash-password.mjs "your-password"
 */
import bcrypt from "bcryptjs";

const plain = process.argv[2];
if (!plain) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(plain, 10);
console.log(hash);
