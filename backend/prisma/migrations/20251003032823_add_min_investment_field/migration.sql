-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "minInvestment" DOUBLE PRECISION,
ADD COLUMN     "profitSharingPercentageAfterBEP" DOUBLE PRECISION;
