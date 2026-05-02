-- AlterTable
ALTER TABLE "ArusKas" ADD COLUMN "pendingPoApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ArusKas" ADD COLUMN "markedForDeletion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ArusKas" ADD COLUMN "pendingEditData" JSONB;
