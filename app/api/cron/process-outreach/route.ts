import { NextRequest, NextResponse } from 'next/server';
import { getDueOutreachItems, processBatchOutreach } from '@/lib/outreach/processor';

// Max items to process per cron run
const BATCH_SIZE = 10;

/**
 * Cron endpoint to process scheduled outreach messages
 *
 * This endpoint is called by Vercel Cron every 5 minutes.
 * It fetches outreach items that are due for sending and processes them.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('Cron: Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Cron: Starting outreach processing...');

    // Get items that are due for sending
    const dueItems = await getDueOutreachItems(BATCH_SIZE);

    if (dueItems.length === 0) {
      console.log('Cron: No items to process');
      return NextResponse.json({
        processed: 0,
        successful: 0,
        failed: 0,
        message: 'No items to process',
      });
    }

    console.log(`Cron: Processing ${dueItems.length} outreach items...`);

    // Process the batch
    const result = await processBatchOutreach(dueItems);

    console.log(`Cron: Completed - ${result.successful} successful, ${result.failed} failed`);

    return NextResponse.json({
      processed: dueItems.length,
      successful: result.successful,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Cron: Error processing outreach:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
