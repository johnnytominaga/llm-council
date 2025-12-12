/**
 * Temporary admin endpoint to add attachments column and fix data.
 * DELETE THIS FILE AFTER RUNNING ONCE.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Step 1: Try to add the attachments column (will fail silently if it exists)
    try {
      await db.run(sql`ALTER TABLE message ADD COLUMN attachments TEXT`);
      console.log('Added attachments column');
    } catch (addError) {
      console.log('Column might already exist:', addError);
      // Column might already exist, continue
    }

    // Step 2: Get all messages and check attachments
    const messages = await db.all(sql`SELECT id, attachments FROM message`);

    let fixed = 0;
    for (const msg of messages as any[]) {
      const attachments = msg.attachments;
      if (attachments && attachments !== 'NULL' && attachments !== '') {
        // Try to parse it
        try {
          JSON.parse(attachments);
        } catch {
          // Invalid JSON, set to NULL
          await db.run(sql`UPDATE message SET attachments = NULL WHERE id = ${msg.id}`);
          fixed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} messages with invalid attachments`,
      total: messages.length,
    });
  } catch (error) {
    console.error('Error fixing attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fix attachments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
