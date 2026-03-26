-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_investorId_fkey";

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "projectOwnerId" TEXT,
ALTER COLUMN "investorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_projectOwnerId_fkey" FOREIGN KEY ("projectOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
