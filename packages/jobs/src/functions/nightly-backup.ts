import { inngest } from '../client';

/**
 * Nightly logical dump of the Supabase database to a cross-region S3 bucket.
 * In practice this runs as a GitHub Actions scheduled workflow (more headroom
 * than a serverless function for pg_dump), but Inngest also triggers a health
 * check on the previous night's dump and pings ops on failure.
 */
export const nightlyBackupHealthcheck = inngest.createFunction(
  { id: 'nightly-backup-healthcheck', name: 'Nightly backup healthcheck' },
  { cron: '0 6 * * *' }, // 06:00 UTC — after the GH Actions dump completes
  async ({ step }) => {
    const ok = await step.run('verify-dump-exists', async () => {
      // TODO: list S3 bucket, assert most recent object is <30h old
      return true;
    });
    if (!ok) {
      await step.run('alert-ops', async () => {
        // TODO: POST to SLACK_OPS_WEBHOOK_URL
      });
    }
    return { ok };
  },
);
