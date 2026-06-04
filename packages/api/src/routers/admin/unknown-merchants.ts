import { router, adminProcedure } from '../../trpc';
import { schema, sql } from '@middleman/db';

export const unknownMerchantsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.subscriptions)
      .where(sql`${schema.subscriptions.providerId} is null`)
      .limit(200);
  }),
});
