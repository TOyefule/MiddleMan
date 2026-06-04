import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from './schema';

export * as schema from './schema';
export { sql, eq, and, or, not, gt, gte, lt, lte, inArray, desc, asc } from 'drizzle-orm';

type NodeDb = ReturnType<typeof drizzlePg<typeof schema>>;
type EdgeDb = ReturnType<typeof drizzleNeon<typeof schema>>;

let nodeClient: ReturnType<typeof postgres> | undefined;
let nodeDb: NodeDb | undefined;

/**
 * Drizzle client for Node runtime (default). Uses postgres-js with Supabase pooler.
 * Reuses a single connection pool per process.
 */
export function getDb(): NodeDb {
  if (!nodeDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    nodeClient = postgres(url, { prepare: false, max: 10 });
    nodeDb = drizzlePg(nodeClient, { schema, logger: false });
  }
  return nodeDb;
}

/**
 * Drizzle client for Edge runtime (Stripe Issuing auth webhook).
 * Uses Neon HTTP driver — works in Edge/Workers, no persistent connections.
 */
export function getEdgeDb(): EdgeDb {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const client = neon(url);
  return drizzleNeon(client, { schema });
}

export async function closeDb(): Promise<void> {
  if (nodeClient) {
    await nodeClient.end();
    nodeClient = undefined;
    nodeDb = undefined;
  }
}
