import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@middleman/api';
import { auth } from '@clerk/nextjs/server';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      const clerkAuth = await auth();
      return createContext({
        auth: clerkAuth.userId ? { userId: clerkAuth.userId, sessionId: clerkAuth.sessionId ?? undefined } : null,
        headers: new Headers(req.headers),
      });
    },
    onError: ({ path, error }) => {
      console.error(`tRPC error on ${path}:`, error);
    },
  });
};

export { handler as GET, handler as POST };
