import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL ?? "postgresql://nexus:nexus@localhost:5432/nexus";

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
