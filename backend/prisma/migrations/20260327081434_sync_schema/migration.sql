-- CreateEnum
CREATE TYPE "ArusKasType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "StokCategory" AS ENUM ('BAHAN', 'LAIN');

-- CreateEnum
CREATE TYPE "POType" AS ENUM ('BAHAN', 'MANUAL');

-- CreateEnum
CREATE TYPE "CashBookType" AS ENUM ('UMUM', 'PEMBANTU');

-- CreateEnum
CREATE TYPE "POPaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "ArusKasStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'ADMIN_PUSAT';
ALTER TYPE "Role" ADD VALUE 'ADMIN_DAPUR';
ALTER TYPE "Role" ADD VALUE 'PRODUKSI';
ALTER TYPE "Role" ADD VALUE 'MICRO_INVESTOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "DapurUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING',
    "projectOwnerId" TEXT NOT NULL,
    "adminPusatId" TEXT,
    "adminDapurId" TEXT,
    "logoUrl" TEXT,
    "fullAddress" TEXT,
    "signatureUrl" TEXT,
    "adminDapurName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DapurUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DapurInvestor" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "investmentAmount" DOUBLE PRECISION NOT NULL,
    "profitSharingPct" DOUBLE PRECISION NOT NULL,
    "profitSharingPctPreBEP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitSharingPctPostBEP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DapurInvestor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DapurDividend" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "period" TEXT,
    "description" TEXT,
    "reportedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DapurDividend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DapurDividendDistribution" (
    "id" TEXT NOT NULL,
    "dividendId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DapurDividendDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArusKas" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "type" "ArusKasType" NOT NULL,
    "bookType" "CashBookType" NOT NULL DEFAULT 'UMUM',
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "referenceNo" TEXT,
    "evidenceUrl" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL DEFAULT 'EXTERNAL',
    "status" "ArusKasStatus" NOT NULL DEFAULT 'PENDING',
    "reportedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArusKas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArusKasItem" (
    "id" TEXT NOT NULL,
    "arusKasId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "pricePerUnit" DOUBLE PRECISION,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArusKasItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stok" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "category" "StokCategory" NOT NULL DEFAULT 'BAHAN',
    "lastUpdatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'PENDING',
    "type" "POType" NOT NULL DEFAULT 'BAHAN',
    "paymentStatus" "POPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "arusKasId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "supplierName" TEXT,
    "unit" TEXT,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "isOrdered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "POItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DapurCashback" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "supplierName" TEXT,
    "purchaseOrderId" TEXT,
    "description" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DapurCashback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadingGood" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadingGood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadingGoodItem" (
    "id" TEXT NOT NULL,
    "loadingGoodId" TEXT NOT NULL,
    "poItemId" TEXT NOT NULL,
    "quantityReceived" DOUBLE PRECISION NOT NULL,
    "quantityRejected" DOUBLE PRECISION NOT NULL,
    "quantityReturned" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "qualityCheck" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadingGoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "calories" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "dapurUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuIngredient" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "portionTypeId" TEXT NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "gramsPerPortion" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyMenuPlan" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyMenuPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMenuEntry" (
    "id" TEXT NOT NULL,
    "monthlyPlanId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "menuId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMenuEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMenuPortion" (
    "id" TEXT NOT NULL,
    "dailyEntryId" TEXT NOT NULL,
    "portionTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "DailyMenuPortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroInvestor" (
    "id" TEXT NOT NULL,
    "parentInvestorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "internalSharePct" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroInvestor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroDividend" (
    "id" TEXT NOT NULL,
    "financialReportId" TEXT,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MICRO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicroDividend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DapurInvestor_dapurUnitId_investorId_key" ON "DapurInvestor"("dapurUnitId", "investorId");

-- CreateIndex
CREATE INDEX "DapurDividend_dapurUnitId_idx" ON "DapurDividend"("dapurUnitId");

-- CreateIndex
CREATE INDEX "DapurDividend_reportedById_idx" ON "DapurDividend"("reportedById");

-- CreateIndex
CREATE INDEX "DapurDividendDistribution_investorId_idx" ON "DapurDividendDistribution"("investorId");

-- CreateIndex
CREATE INDEX "DapurDividendDistribution_dividendId_idx" ON "DapurDividendDistribution"("dividendId");

-- CreateIndex
CREATE UNIQUE INDEX "DapurDividendDistribution_dividendId_investorId_key" ON "DapurDividendDistribution"("dividendId", "investorId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_arusKasId_key" ON "PurchaseOrder"("arusKasId");

-- CreateIndex
CREATE INDEX "DapurCashback_dapurUnitId_idx" ON "DapurCashback"("dapurUnitId");

-- CreateIndex
CREATE INDEX "DapurCashback_reportedById_idx" ON "DapurCashback"("reportedById");

-- CreateIndex
CREATE UNIQUE INDEX "PortionType_name_key" ON "PortionType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_name_dapurUnitId_key" ON "Menu"("name", "dapurUnitId");

-- CreateIndex
CREATE INDEX "MenuIngredient_menuId_idx" ON "MenuIngredient"("menuId");

-- CreateIndex
CREATE INDEX "MenuIngredient_portionTypeId_idx" ON "MenuIngredient"("portionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuIngredient_menuId_portionTypeId_ingredientName_key" ON "MenuIngredient"("menuId", "portionTypeId", "ingredientName");

-- CreateIndex
CREATE INDEX "MonthlyMenuPlan_dapurUnitId_idx" ON "MonthlyMenuPlan"("dapurUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyMenuPlan_dapurUnitId_year_month_key" ON "MonthlyMenuPlan"("dapurUnitId", "year", "month");

-- CreateIndex
CREATE INDEX "DailyMenuEntry_monthlyPlanId_idx" ON "DailyMenuEntry"("monthlyPlanId");

-- CreateIndex
CREATE INDEX "DailyMenuEntry_date_idx" ON "DailyMenuEntry"("date");

-- CreateIndex
CREATE INDEX "DailyMenuEntry_menuId_idx" ON "DailyMenuEntry"("menuId");

-- CreateIndex
CREATE INDEX "DailyMenuPortion_dailyEntryId_idx" ON "DailyMenuPortion"("dailyEntryId");

-- CreateIndex
CREATE INDEX "DailyMenuPortion_portionTypeId_idx" ON "DailyMenuPortion"("portionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMenuPortion_dailyEntryId_portionTypeId_key" ON "DailyMenuPortion"("dailyEntryId", "portionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "MicroInvestor_userId_key" ON "MicroInvestor"("userId");

-- CreateIndex
CREATE INDEX "MicroInvestor_parentInvestorId_idx" ON "MicroInvestor"("parentInvestorId");

-- CreateIndex
CREATE INDEX "MicroInvestor_dapurUnitId_idx" ON "MicroInvestor"("dapurUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorWallet_userId_key" ON "InvestorWallet"("userId");

-- AddForeignKey
ALTER TABLE "DapurUnit" ADD CONSTRAINT "DapurUnit_projectOwnerId_fkey" FOREIGN KEY ("projectOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurUnit" ADD CONSTRAINT "DapurUnit_adminPusatId_fkey" FOREIGN KEY ("adminPusatId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurUnit" ADD CONSTRAINT "DapurUnit_adminDapurId_fkey" FOREIGN KEY ("adminDapurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurInvestor" ADD CONSTRAINT "DapurInvestor_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurInvestor" ADD CONSTRAINT "DapurInvestor_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurDividend" ADD CONSTRAINT "DapurDividend_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurDividend" ADD CONSTRAINT "DapurDividend_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurDividendDistribution" ADD CONSTRAINT "DapurDividendDistribution_dividendId_fkey" FOREIGN KEY ("dividendId") REFERENCES "DapurDividend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurDividendDistribution" ADD CONSTRAINT "DapurDividendDistribution_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArusKas" ADD CONSTRAINT "ArusKas_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArusKas" ADD CONSTRAINT "ArusKas_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArusKas" ADD CONSTRAINT "ArusKas_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArusKasItem" ADD CONSTRAINT "ArusKasItem_arusKasId_fkey" FOREIGN KEY ("arusKasId") REFERENCES "ArusKas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stok" ADD CONSTRAINT "Stok_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stok" ADD CONSTRAINT "Stok_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_arusKasId_fkey" FOREIGN KEY ("arusKasId") REFERENCES "ArusKas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POItem" ADD CONSTRAINT "POItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POItem" ADD CONSTRAINT "POItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurCashback" ADD CONSTRAINT "DapurCashback_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurCashback" ADD CONSTRAINT "DapurCashback_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurCashback" ADD CONSTRAINT "DapurCashback_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingGood" ADD CONSTRAINT "LoadingGood_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingGood" ADD CONSTRAINT "LoadingGood_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingGoodItem" ADD CONSTRAINT "LoadingGoodItem_loadingGoodId_fkey" FOREIGN KEY ("loadingGoodId") REFERENCES "LoadingGood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadingGoodItem" ADD CONSTRAINT "LoadingGoodItem_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "POItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Menu" ADD CONSTRAINT "Menu_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuIngredient" ADD CONSTRAINT "MenuIngredient_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuIngredient" ADD CONSTRAINT "MenuIngredient_portionTypeId_fkey" FOREIGN KEY ("portionTypeId") REFERENCES "PortionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyMenuPlan" ADD CONSTRAINT "MonthlyMenuPlan_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMenuEntry" ADD CONSTRAINT "DailyMenuEntry_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "MonthlyMenuPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMenuEntry" ADD CONSTRAINT "DailyMenuEntry_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMenuPortion" ADD CONSTRAINT "DailyMenuPortion_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "DailyMenuEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMenuPortion" ADD CONSTRAINT "DailyMenuPortion_portionTypeId_fkey" FOREIGN KEY ("portionTypeId") REFERENCES "PortionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroInvestor" ADD CONSTRAINT "MicroInvestor_parentInvestorId_fkey" FOREIGN KEY ("parentInvestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroInvestor" ADD CONSTRAINT "MicroInvestor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroInvestor" ADD CONSTRAINT "MicroInvestor_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorWallet" ADD CONSTRAINT "InvestorWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroDividend" ADD CONSTRAINT "MicroDividend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
