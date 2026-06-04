import { router, protectedProcedure } from '../trpc';
import * as kycService from '../services/kyc';

export const kycRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    return kycService.getStatus({ userId: ctx.user.id });
  }),

  startFullVerification: protectedProcedure.mutation(async ({ ctx }) => {
    return kycService.startStripeIdentitySession({ userId: ctx.user.id });
  }),
});
