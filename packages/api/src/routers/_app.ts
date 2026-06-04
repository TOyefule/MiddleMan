import { router } from '../trpc';
import { meRouter } from './me';
import { subscriptionsRouter } from './subscriptions';
import { paymentMethodsRouter } from './payment-methods';
import { billsRouter } from './bills';
import { cancellationsRouter } from './cancellations';
import { kycRouter } from './kyc';
import { adminRouter } from './admin/_index';

export const appRouter = router({
  me: meRouter,
  subscriptions: subscriptionsRouter,
  paymentMethods: paymentMethodsRouter,
  bills: billsRouter,
  cancellations: cancellationsRouter,
  kyc: kycRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
