-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'MANUAL';

-- AlterEnum
ALTER TYPE "SubscriptionPlan" ADD VALUE 'ENTERPRISE_CUSTOM';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "customCurrency" TEXT DEFAULT 'IDR',
ADD COLUMN     "customPrice" DOUBLE PRECISION,
ADD COLUMN     "labelId" TEXT;

-- CreateTable
CREATE TABLE "EnterpriseLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactEmail" TEXT,
    "defaultPrice" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'IDR',
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelInvestor" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelInvestor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseLabel_code_key" ON "EnterpriseLabel"("code");

-- CreateIndex
CREATE INDEX "LabelInvestor_labelId_idx" ON "LabelInvestor"("labelId");

-- CreateIndex
CREATE INDEX "LabelInvestor_userId_idx" ON "LabelInvestor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LabelInvestor_labelId_userId_key" ON "LabelInvestor"("labelId", "userId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "EnterpriseLabel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelInvestor" ADD CONSTRAINT "LabelInvestor_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "EnterpriseLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelInvestor" ADD CONSTRAINT "LabelInvestor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
