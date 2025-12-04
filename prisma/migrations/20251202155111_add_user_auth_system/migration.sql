/*
  Migration: Add User Authentication System

  This migration adds User and SocialAccount models for multi-user support.
  Existing communities will be assigned to a default system user.
*/

-- CreateTable: Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: Social Accounts (encrypted tokens)
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "extra" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create a default system user for existing communities
INSERT INTO "users" ("id", "email", "passwordHash", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000000', 'system@omnistream.local', '$2b$10$defaulthash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables: Add userId to communities
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_communities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "communities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing communities and assign them to the system user
INSERT INTO "new_communities" ("createdAt", "id", "name", "updatedAt", "userId")
SELECT "createdAt", "id", "name", "updatedAt", '00000000-0000-0000-0000-000000000000' FROM "communities";

DROP TABLE "communities";
ALTER TABLE "new_communities" RENAME TO "communities";
CREATE INDEX "communities_userId_idx" ON "communities"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_userId_platform_key" ON "social_accounts"("userId", "platform");
