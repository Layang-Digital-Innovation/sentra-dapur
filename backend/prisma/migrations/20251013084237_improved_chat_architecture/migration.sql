/*
  Warnings:

  - The values [TRADING] on the enum `ChatType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `adminId` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `buyerId` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `investorId` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `projectOwnerId` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `sellerId` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `readAt` on the `Message` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ChatParticipantRole" AS ENUM ('ADMIN', 'MEMBER', 'OBSERVER');

-- AlterEnum
BEGIN;
CREATE TYPE "ChatType_new" AS ENUM ('INVESTMENT_INQUIRY', 'PROJECT_DISCUSSION', 'TRADING_SUPPORT', 'GENERAL_SUPPORT');
ALTER TABLE "Chat" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Chat" ALTER COLUMN "type" TYPE "ChatType_new" USING ("type"::text::"ChatType_new");
ALTER TYPE "ChatType" RENAME TO "ChatType_old";
ALTER TYPE "ChatType_new" RENAME TO "ChatType";
DROP TYPE "ChatType_old";
ALTER TABLE "Chat" ALTER COLUMN "type" SET DEFAULT 'INVESTMENT_INQUIRY';
COMMIT;

-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'SYSTEM';

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_adminId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_investorId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_projectOwnerId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_sellerId_fkey";

-- DropIndex
DROP INDEX "Chat_adminId_idx";

-- DropIndex
DROP INDEX "Chat_investorId_idx";

-- DropIndex
DROP INDEX "Message_chatId_idx";

-- DropIndex
DROP INDEX "Message_createdAt_idx";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "adminId",
DROP COLUMN "buyerId",
DROP COLUMN "investorId",
DROP COLUMN "projectOwnerId",
DROP COLUMN "sellerId";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "isRead",
DROP COLUMN "readAt",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replyToId" TEXT;

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "lastReadAt" TIMESTAMP(3),
    "lastReadMessageId" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");

-- CreateIndex
CREATE INDEX "ChatParticipant_chatId_idx" ON "ChatParticipant"("chatId");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_lastReadAt_idx" ON "ChatParticipant"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_chatId_userId_key" ON "ChatParticipant"("chatId", "userId");

-- CreateIndex
CREATE INDEX "Chat_lastMessageAt_idx" ON "Chat"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
