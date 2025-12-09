/**
 * Script to manually verify a user's email and check account status
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { db } from '../lib/db';
import { user, account } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyUser(email: string) {
  console.log(`\nChecking user: ${email}\n`);

  try {
    // Find user
    const users = await db.select().from(user).where(eq(user.email, email));
    
    if (users.length === 0) {
      console.log('❌ User not found!');
      return;
    }

    const userData = users[0];
    console.log('User found:');
    console.log('  ID:', userData.id);
    console.log('  Name:', userData.name);
    console.log('  Email:', userData.email);
    console.log('  Email Verified:', userData.emailVerified);
    console.log('  Created:', userData.createdAt);
    console.log('');

    // Find accounts
    const accounts = await db.select().from(account).where(eq(account.userId, userData.id));
    console.log(`Found ${accounts.length} account(s):`);
    accounts.forEach((acc, i) => {
      console.log(`  ${i + 1}. Provider: ${acc.providerId}, Has Password: ${!!acc.password}`);
    });
    console.log('');

    // Verify email if not verified
    if (!userData.emailVerified) {
      console.log('Verifying email...');
      await db.update(user)
        .set({ emailVerified: true })
        .where(eq(user.id, userData.id));
      console.log('✅ Email verified successfully!');
    } else {
      console.log('✅ Email already verified');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'johnny@kilonova.ventures';
verifyUser(email);
