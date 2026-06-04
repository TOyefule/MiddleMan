import { z } from 'zod';
import { router, adminProcedure } from '../../trpc';
import { schema, eq } from '@middleman/db';

export const floatCapsRouter = router({
  lift: adminProcedure
    .input(z.object({ userId: z.string().uuid(), newCapCents: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(schema.users)
        .set({ monthlyCapCents: input.newCapCents })
        .where(eq(schema.users.id, input.userId))
        .returning();
      await ctx.db.insert(schema.auditLog).values({
        actorAdminId: ctx.admin.id,
        actorType: 'admin',
        action: 'float_cap.lift',
        targetType: 'user',
        targetId: input.userId,
        diff: { newCapCents: input.newCapCents } as Record<string, unknown>,
        ip: ctx.reqIp,
        userAgent: ctx.userAgent,
      });
      return updated;
    }),
});
