import { getDb, schema, eq } from '@middleman/db';
import type { Admin, User } from '@middleman/db/types';

export type ClerkAuth = {
  userId: string;
  sessionId?: string;
  orgId?: string;
};

export type Context = {
  db: ReturnType<typeof getDb>;
  auth: ClerkAuth | null;
  user: User | null;
  admin: Admin | null;
  reqIp: string | null;
  userAgent: string | null;
};

export type CreateContextOptions = {
  auth: ClerkAuth | null;
  headers: Headers;
};

export async function createContext({ auth, headers }: CreateContextOptions): Promise<Context> {
  const db = getDb();
  let user: User | null = null;
  let admin: Admin | null = null;

  if (auth?.userId) {
    const [u] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.clerkUserId, auth.userId))
      .limit(1);
    user = u ?? null;

    const [a] = await db
      .select()
      .from(schema.admins)
      .where(eq(schema.admins.clerkUserId, auth.userId))
      .limit(1);
    admin = a ?? null;
  }

  return {
    db,
    auth,
    user,
    admin,
    reqIp: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: headers.get('user-agent') ?? null,
  };
}
