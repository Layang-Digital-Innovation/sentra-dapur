/*
  Warnings:

  - You are about to drop the column `userId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the `LabelInvestor` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[dapurUnitId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ArusKas" DROP CONSTRAINT "ArusKas_dapurUnitId_fkey";

-- DropForeignKey
ALTER TABLE "DapurCashback" DROP CONSTRAINT "DapurCashback_dapurUnitId_fkey";

-- DropForeignKey
ALTER TABLE "DapurDividend" DROP CONSTRAINT "DapurDividend_dapurUnitId_fkey";

-- DropForeignKey
ALTER TABLE "DapurInvestor" DROP CONSTRAINT "DapurInvestor_dapurUnitId_fkey";

-- DropForeignKey
ALTER TABLE "LabelInvestor" DROP CONSTRAINT "LabelInvestor_labelId_fkey";

-- DropForeignKey
ALTER TABLE "LabelInvestor" DROP CONSTRAINT "LabelInvestor_userId_fkey";

-- DropForeignKey
ALTER TABLE "MicroInvestor" DROP CONSTRAINT "MicroInvestor_dapurUnitId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_dapurUnitId_fkey";

-- DropForeignKey
ALTER TABLE "Stok" DROP CONSTRAINT "Stok_dapurUnitId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropIndex
DROP INDEX "Subscription_userId_key";

-- AlterTable
ALTER TABLE "ArusKas" ALTER COLUMN "dapurUnitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DapurCashback" ALTER COLUMN "dapurUnitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DapurDividend" ALTER COLUMN "dapurUnitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DapurInvestor" ALTER COLUMN "dapurUnitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MicroInvestor" ALTER COLUMN "dapurUnitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MonthlyMenuPlan" ALTER COLUMN "dapurUnitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "dapurUnitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Stok" ALTER COLUMN "dapurUnitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "userId",
ADD COLUMN     "dapurUnitId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscriptionId" TEXT;

-- DropTable
DROP TABLE "LabelInvestor";

-- CreateTable
CREATE TABLE "LabelDapur" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "dapurUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelDapur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabelDapur_labelId_idx" ON "LabelDapur"("labelId");

-- CreateIndex
CREATE INDEX "LabelDapur_dapurUnitId_idx" ON "LabelDapur"("dapurUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "LabelDapur_labelId_dapurUnitId_key" ON "LabelDapur"("labelId", "dapurUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_dapurUnitId_key" ON "Subscription"("dapurUnitId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelDapur" ADD CONSTRAINT "LabelDapur_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "EnterpriseLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelDapur" ADD CONSTRAINT "LabelDapur_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurInvestor" ADD CONSTRAINT "DapurInvestor_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurDividend" ADD CONSTRAINT "DapurDividend_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArusKas" ADD CONSTRAINT "ArusKas_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stok" ADD CONSTRAINT "Stok_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurCashback" ADD CONSTRAINT "DapurCashback_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroInvestor" ADD CONSTRAINT "MicroInvestor_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
