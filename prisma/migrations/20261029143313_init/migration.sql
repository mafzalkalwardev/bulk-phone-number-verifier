-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "defaultCountry" TEXT NOT NULL DEFAULT 'US',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "invalidCount" INTEGER NOT NULL DEFAULT 0,
    "unallocatedCount" INTEGER NOT NULL DEFAULT 0,
    "validMobileCount" INTEGER NOT NULL DEFAULT 0,
    "validOtherCount" INTEGER NOT NULL DEFAULT 0,
    "unknownCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "e164" TEXT,
    "country" TEXT,
    "lineType" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'pending',
    "blockStatus" TEXT,
    "blockPrefix" TEXT,
    "blockCarrier" TEXT,
    "blockSource" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "formatsJson" TEXT,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NumberBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "country" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "carrier" TEXT,
    "ocn" TEXT,
    "source" TEXT NOT NULL,
    "metaJson" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LookupCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "e164" TEXT NOT NULL,
    "resultHash" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rowsUpserted" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "JobRow_jobId_idx" ON "JobRow"("jobId");

-- CreateIndex
CREATE INDEX "JobRow_classification_idx" ON "JobRow"("classification");

-- CreateIndex
CREATE INDEX "JobRow_e164_idx" ON "JobRow"("e164");

-- CreateIndex
CREATE INDEX "NumberBlock_country_prefix_idx" ON "NumberBlock"("country", "prefix");

-- CreateIndex
CREATE INDEX "NumberBlock_prefix_idx" ON "NumberBlock"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "NumberBlock_country_prefix_key" ON "NumberBlock"("country", "prefix");

-- CreateIndex
CREATE UNIQUE INDEX "LookupCache_e164_key" ON "LookupCache"("e164");

-- CreateIndex
CREATE INDEX "LookupCache_expiresAt_idx" ON "LookupCache"("expiresAt");
