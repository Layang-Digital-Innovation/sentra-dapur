-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "labelId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_labelId_idx" ON "Payment"("labelId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "EnterpriseLabel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
