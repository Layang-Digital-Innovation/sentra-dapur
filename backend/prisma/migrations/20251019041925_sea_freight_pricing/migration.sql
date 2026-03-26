-- CreateEnum
CREATE TYPE "SeaPricingMode" AS ENUM ('CBM', 'CONTAINER');

-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('FT20', 'FT40');

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "cbmVolume" DOUBLE PRECISION,
ADD COLUMN     "containerType" "ContainerType",
ADD COLUMN     "currency" TEXT DEFAULT 'USD',
ADD COLUMN     "freightCost" DOUBLE PRECISION,
ADD COLUMN     "seaPricingMode" "SeaPricingMode";
