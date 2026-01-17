/**
 * Generate bcrypt hash for admin password
 * Run with: npx ts-node scripts/generate-password-hash.ts
 */

import bcrypt from 'bcrypt';

const password = 'Admin@123';
const rounds = 10;

bcrypt.hash(password, rounds)
  .then((hash) => {
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nUse this hash in the seed.sql file for the admin user.');
  })
  .catch((error) => {
    console.error('Error generating hash:', error);
  });

