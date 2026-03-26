-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "subscriptionId" TEXT;
