/**
 * Test script to verify BetterAuth signup is working.
 * Run with: npx tsx scripts/test-signup.ts
 */

import { auth } from '../lib/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSignup() {
  console.log('Testing BetterAuth signup...\n');

  try {
    // Test credentials
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    const testName = 'Test User';

    console.log('Attempting to create account:');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Name: ${testName}`);
    console.log('');

    // Try to sign up
    const result = await auth.api.signUpEmail({
      body: {
        email: testEmail,
        password: testPassword,
        name: testName,
      },
    });

    console.log('✅ Signup successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Signup failed!');
    console.error('Error:', error);

    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testSignup();
