/**
 * Cron endpoint to process automation queue
 *
 * Processes pending automation jobs (outreach, questionnaire, test task, invite, rejection).
 * Runs daily at 10:00 UTC via Vercel Cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { fetchPendingJobs, markJobProcessing, markJobCompleted, markJobFailed } from '@/lib/automation/queue';
import { executeAutomationJob } from '@/lib/automation/handlers';

const BATCH_SIZE = 10;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const secretParam = url.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        secretParam === cronSecret;

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Automation Cron: Starting...');

    const supabase = createServiceRoleClient();
    const jobs = await fetchPendingJobs(supabase, BATCH_SIZE);

    if (jobs.length === 0) {
      console.log('Automation Cron: No pending jobs');
      return NextResponse.json({ processed: 0, successful: 0, failed: 0 });
    }

    console.log(`Automation Cron: Processing ${jobs.length} jobs...`);

    let successful = 0;
    let failed = 0;

    for (const job of jobs) {
      await markJobProcessing(supabase, job.id);

      try {
        await executeAutomationJob(supabase, job);
        await markJobCompleted(supabase, job.id);
        successful++;
        console.log(`Automation Cron: ${job.action_type} for candidate ${job.candidate_id} — completed`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await markJobFailed(supabase, job.id, errorMsg, job.retry_count);
        failed++;
        console.error(`Automation Cron: ${job.action_type} for candidate ${job.candidate_id} — failed: ${errorMsg}`);
      }

      // Small delay between jobs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Automation Cron: Done — ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      processed: jobs.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error('Automation Cron: Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
