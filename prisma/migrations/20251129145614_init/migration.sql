-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "oauth_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "tokens" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "communityId" TEXT NOT NULL,
    CONSTRAINT "oauth_tokens_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rtmpUrl" TEXT NOT NULL,
    "rtmpKey" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "scheduledStartTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "streams_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "platform_streams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformStreamId" TEXT,
    "status" TEXT NOT NULL,
    "viewerCount" INTEGER,
    "platformUrl" TEXT,
    "error" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_streams_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformMessageId" TEXT,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorImageUrl" TEXT,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "oauth_tokens_communityId_idx" ON "oauth_tokens"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_communityId_platform_key" ON "oauth_tokens"("communityId", "platform");

-- CreateIndex
CREATE INDEX "streams_communityId_idx" ON "streams"("communityId");

-- CreateIndex
CREATE INDEX "platform_streams_streamId_idx" ON "platform_streams"("streamId");

-- CreateIndex
CREATE INDEX "platform_streams_status_idx" ON "platform_streams"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_streams_streamId_platform_key" ON "platform_streams"("streamId", "platform");

-- CreateIndex
CREATE INDEX "chat_messages_streamId_idx" ON "chat_messages"("streamId");

-- CreateIndex
CREATE INDEX "chat_messages_timestamp_idx" ON "chat_messages"("timestamp");

-- CreateIndex
CREATE INDEX "chat_messages_streamId_timestamp_idx" ON "chat_messages"("streamId", "timestamp");
