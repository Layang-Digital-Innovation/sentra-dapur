-- CreateTable
CREATE TABLE "DapurLabaRugi" (
    "id" TEXT NOT NULL,
    "dapurUnitId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalIncome" DOUBLE PRECISION NOT NULL,
    "totalExpense" DOUBLE PRECISION NOT NULL,
    "netProfit" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DapurLabaRugi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DapurLabaRugi_dapurUnitId_idx" ON "DapurLabaRugi"("dapurUnitId");

-- CreateIndex
CREATE INDEX "DapurLabaRugi_publishedById_idx" ON "DapurLabaRugi"("publishedById");

-- CreateIndex
CREATE UNIQUE INDEX "DapurLabaRugi_dapurUnitId_period_key" ON "DapurLabaRugi"("dapurUnitId", "period");

-- AddForeignKey
ALTER TABLE "DapurLabaRugi" ADD CONSTRAINT "DapurLabaRugi_dapurUnitId_fkey" FOREIGN KEY ("dapurUnitId") REFERENCES "DapurUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DapurLabaRugi" ADD CONSTRAINT "DapurLabaRugi_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
