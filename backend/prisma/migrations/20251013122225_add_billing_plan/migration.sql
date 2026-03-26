-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerPlanId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_providerPlanId_key" ON "BillingPlan"("providerPlanId");

-- CreateIndex
CREATE INDEX "BillingPlan_provider_idx" ON "BillingPlan"("provider");

-- CreateIndex
CREATE INDEX "BillingPlan_plan_idx" ON "BillingPlan"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_provider_plan_period_key" ON "BillingPlan"("provider", "plan", "period");
