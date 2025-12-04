-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "scheduled_jobs_userId_idx" ON "scheduled_jobs"("userId");

-- CreateIndex
CREATE INDEX "scheduled_jobs_status_scheduledAt_idx" ON "scheduled_jobs"("status", "scheduledAt");
