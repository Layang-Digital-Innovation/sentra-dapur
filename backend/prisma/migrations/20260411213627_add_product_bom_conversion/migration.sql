-- CreateTable
CREATE TABLE "ProductBomConversion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productionUnit" TEXT NOT NULL,
    "conversionFactor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBomConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBomConversion_productId_idx" ON "ProductBomConversion"("productId");

-- CreateIndex
CREATE INDEX "ProductBomConversion_productionUnit_idx" ON "ProductBomConversion"("productionUnit");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBomConversion_productId_productionUnit_key" ON "ProductBomConversion"("productId", "productionUnit");

-- AddForeignKey
ALTER TABLE "ProductBomConversion" ADD CONSTRAINT "ProductBomConversion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
