/**
 * Test script to verify AhaSend email sending.
 * Run with: npx tsx scripts/test-email.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEmail() {
  const apiKey = process.env.AHASEND_API_KEY;
  const accountId = process.env.AHASEND_ACCOUNT_ID;
  const fromDomain = process.env.EMAIL_FROM_DOMAIN || 'authmail.kilonovaventures.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Kilonova LLM Council';

  console.log('Testing AhaSend email sending...\n');
  console.log('Configuration:');
  console.log('  API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
  console.log('  Account ID:', accountId ? `${accountId.substring(0, 8)}...` : 'NOT SET');
  console.log('  From Domain:', fromDomain);
  console.log('  From Name:', fromName);
  console.log('');

  if (!apiKey) {
    console.error('❌ AHASEND_API_KEY is not set in .env.local');
    process.exit(1);
  }

  if (!accountId) {
    console.error('❌ AHASEND_ACCOUNT_ID is not set in .env.local');
    process.exit(1);
  }

  try {
    console.log('Sending test email...');

    const response = await fetch(`https://api.ahasend.com/v2/accounts/${accountId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          email: `noreply@${fromDomain}`,
          name: fromName,
        },
        recipients: [
          {
            email: 'johnny@kilonova.ventures',
          }
        ],
        subject: 'Test Email from LLM Council',
        html_content: '<h1>Test Email</h1><p>This is a test email from your LLM Council app.</p>',
        text_content: 'Test Email - This is a test email from your LLM Council app.',
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      console.error('\n❌ Email sending failed!');
      console.error('Status:', response.status);
      console.error('Error:', responseText);

      // Common error messages
      if (response.status === 401) {
        console.error('\n⚠️  Authentication failed. Check your API key.');
      } else if (response.status === 403) {
        console.error('\n⚠️  Domain not verified. Verify your domain in AhaSend dashboard.');
      } else if (response.status === 429) {
        console.error('\n⚠️  Rate limit exceeded. Wait a moment and try again.');
      }

      process.exit(1);
    }

    const result = JSON.parse(responseText);
    console.log('\n✅ Email sent successfully!');
    console.log('Result:', result);
    console.log('\nCheck your inbox for the test email.');
  } catch (error) {
    console.error('\n❌ Error sending email:');
    console.error(error);
    process.exit(1);
  }
}

testEmail();
