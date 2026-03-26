/*
  Warnings:

  - Added the required column `updatedAt` to the `Dividend` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Investment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'TRANSFER_PENDING', 'TRANSFER_UPLOADED', 'APPROVED', 'REJECTED', 'ACTIVE');

-- CreateEnum
CREATE TYPE "DividendStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Dividend" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "chatId" TEXT,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "status" "InvestmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "transferDate" TIMESTAMP(3),
ADD COLUMN     "transferProofFileName" TEXT,
ADD COLUMN     "transferProofUrl" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankName" TEXT;

-- CreateTable
CREATE TABLE "DividendDistribution" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "status" "DividendStatus" NOT NULL DEFAULT 'PENDING',
    "dividendId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentProof" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DividendDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DividendDistribution_dividendId_idx" ON "DividendDistribution"("dividendId");

-- CreateIndex
CREATE INDEX "DividendDistribution_investorId_idx" ON "DividendDistribution"("investorId");

-- CreateIndex
CREATE INDEX "DividendDistribution_investmentId_idx" ON "DividendDistribution"("investmentId");

-- CreateIndex
CREATE INDEX "Investment_investorId_idx" ON "Investment"("investorId");

-- CreateIndex
CREATE INDEX "Investment_projectId_idx" ON "Investment"("projectId");

-- CreateIndex
CREATE INDEX "Investment_status_idx" ON "Investment"("status");

-- AddForeignKey
ALTER TABLE "DividendDistribution" ADD CONSTRAINT "DividendDistribution_dividendId_fkey" FOREIGN KEY ("dividendId") REFERENCES "Dividend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendDistribution" ADD CONSTRAINT "DividendDistribution_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividendDistribution" ADD CONSTRAINT "DividendDistribution_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
