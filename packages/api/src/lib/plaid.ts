import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

let plaidClient: PlaidApi | undefined;

export function getPlaid(): PlaidApi {
  if (!plaidClient) {
    const env = (process.env.PLAID_ENV ?? 'sandbox') as keyof typeof PlaidEnvironments;
    plaidClient = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[env],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
          },
        },
      }),
    );
  }
  return plaidClient;
}
