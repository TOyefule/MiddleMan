import { router, adminProcedure } from '../../trpc';
import { schema, eq } from '@middleman/db';

export const kycQueueRouter = router({
  pending: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.kycProfiles)
      .where(eq(schema.kycProfiles.status, 'manual_review'))
      .limit(100);
  }),
});
