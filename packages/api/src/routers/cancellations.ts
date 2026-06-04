import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import * as cancellationsService from '../services/cancellations';

export const cancellationsRouter = router({
  request: protectedProcedure
    .input(z.object({ subscriptionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return cancellationsService.requestCancellation({
        userId: ctx.user.id,
        subscriptionId: input.subscriptionId,
      });
    }),

  confirmCanceled: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return cancellationsService.confirmCanceled({
        userId: ctx.user.id,
        requestId: input.requestId,
      });
    }),
});
