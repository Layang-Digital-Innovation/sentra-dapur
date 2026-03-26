-- AlterEnum
ALTER TYPE "ChatType" ADD VALUE 'TRADING';

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "buyerId" TEXT,
ADD COLUMN     "sellerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fullname" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
