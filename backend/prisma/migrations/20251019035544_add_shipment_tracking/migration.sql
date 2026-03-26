/*
  Warnings:

  - Added the required column `updatedAt` to the `Shipment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "trackingUrl" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
