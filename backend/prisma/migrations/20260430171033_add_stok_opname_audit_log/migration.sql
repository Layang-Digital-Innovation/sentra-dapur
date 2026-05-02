-- CreateTable
CREATE TABLE "StokOpnameLog" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT,
    "stokId" TEXT,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" "StokCategory" NOT NULL DEFAULT 'BAHAN',
    "beforeQty" DOUBLE PRECISION NOT NULL,
    "afterQty" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "opnameAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StokOpnameLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StokOpnameLog_dapurUnitId_idx" ON "StokOpnameLog"("dapurUnitId");

-- CreateIndex
CREATE INDEX "StokOpnameLog_stokId_idx" ON "StokOpnameLog"("stokId");

-- CreateIndex
CREATE INDEX "StokOpnameLog_performedById_idx" ON "StokOpnameLog"("performedById");

-- CreateIndex
CREATE INDEX "StokOpnameLog_opnameAt_idx" ON "StokOpnameLog"("opnameAt");

-- AddForeignKey
ALTER TABLE "StokOpnameLog" ADD CONSTRAINT "StokOpnameLog_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StokOpnameLog" ADD CONSTRAINT "StokOpnameLog_stokId_fkey" FOREIGN KEY ("stokId") REFERENCES "Stok"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StokOpnameLog" ADD CONSTRAINT "StokOpnameLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
