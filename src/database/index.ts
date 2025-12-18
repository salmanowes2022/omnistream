/**
 * Database factory - switches between in-memory and Prisma (SQLite) based on environment
 */

import { InMemoryDatabase } from './in-memory.js';
import { PrismaDatabase } from './prisma-db.js';

// Determine which database to use based on DATABASE_URL
const usePrisma =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('file:') ||
    process.env.DATABASE_URL.includes('.db') ||
    process.env.DATABASE_URL.startsWith('prisma://'));

export const db = usePrisma ? new PrismaDatabase() : new InMemoryDatabase();

// Export database types for testing
export { InMemoryDatabase } from './in-memory.js';
export { PrismaDatabase } from './prisma-db.js';
