/**
 * Script to clear orphaned users (users without account records).
 * Run with: npx tsx scripts/clear-orphaned-users.ts
 */

import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function clearOrphanedUsers() {
  try {
    console.log('Checking for orphaned users...\n');

    // Get all users
    const usersResult = await client.execute('SELECT * FROM user;');
    console.log(`Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach((row) => {
      console.log(`  - ${row.email} (id: ${row.id})`);
    });

    // Get all accounts
    const accountsResult = await client.execute('SELECT * FROM account;');
    console.log(`\nFound ${accountsResult.rows.length} accounts`);

    // Find users without accounts
    const userIds = usersResult.rows.map((row) => row.id as string);
    const accountUserIds = accountsResult.rows.map((row) => row.userId as string);
    const orphanedUserIds = userIds.filter((id) => !accountUserIds.includes(id));

    if (orphanedUserIds.length === 0) {
      console.log('\n✅ No orphaned users found!');
      return;
    }

    console.log(`\n⚠️  Found ${orphanedUserIds.length} orphaned users (users without accounts):`);
    orphanedUserIds.forEach((id) => {
      const user = usersResult.rows.find((row) => row.id === id);
      console.log(`  - ${user?.email} (id: ${id})`);
    });

    console.log('\nDeleting orphaned users...');
    for (const userId of orphanedUserIds) {
      await client.execute({
        sql: 'DELETE FROM user WHERE id = ?;',
        args: [userId],
      });
      const user = usersResult.rows.find((row) => row.id === userId);
      console.log(`  ✓ Deleted user: ${user?.email}`);
    }

    console.log('\n✅ Database cleaned successfully!');
    console.log('You can now sign up with a fresh account.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearOrphanedUsers();
