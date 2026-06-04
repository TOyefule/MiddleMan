import { router } from '../../trpc';
import { delinquenciesRouter } from './delinquencies';
import { kycQueueRouter } from './kyc-queue';
import { unknownMerchantsRouter } from './unknown-merchants';
import { floatCapsRouter } from './float-caps';

export const adminRouter = router({
  delinquencies: delinquenciesRouter,
  kycQueue: kycQueueRouter,
  unknownMerchants: unknownMerchantsRouter,
  floatCaps: floatCapsRouter,
});
