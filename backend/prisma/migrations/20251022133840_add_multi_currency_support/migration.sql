/*
  Warnings:

  - The `currency` column on the `BillingPlan` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency` column on the `EnterpriseLabel` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency` column on the `Shipment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `customCurrency` column on the `Subscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[provider,plan,period,currency]` on the table `BillingPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('IDR', 'USD');

-- DropIndex
DROP INDEX "BillingPlan_provider_plan_period_key";

-- AlterTable
ALTER TABLE "BillingPlan" DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "EnterpriseLabel" DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" DEFAULT 'IDR';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'IDR',
ADD COLUMN     "pricePerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'IDR';

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "price" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "currency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "customCurrency",
ADD COLUMN     "customCurrency" "Currency" NOT NULL DEFAULT 'IDR';

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPrice_productId_idx" ON "ProductPrice"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_productId_currency_key" ON "ProductPrice"("productId", "currency");

-- CreateIndex
CREATE INDEX "BillingPlan_currency_idx" ON "BillingPlan"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_provider_plan_period_currency_key" ON "BillingPlan"("provider", "plan", "period", "currency");

-- CreateIndex
CREATE INDEX "Payment_currency_idx" ON "Payment"("currency");

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
