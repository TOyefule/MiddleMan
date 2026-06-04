import { router, adminProcedure } from '../../trpc';
import { schema, eq, desc, inArray } from '@middleman/db';

export const delinquenciesRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.bills)
      .where(inArray(schema.bills.status, ['past_due', 'uncollectible']))
      .orderBy(desc(schema.bills.dueDate))
      .limit(200);
  }),
});
