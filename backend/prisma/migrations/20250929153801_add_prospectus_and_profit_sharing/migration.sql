-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "profitSharingPercentage" DOUBLE PRECISION,
ADD COLUMN     "prospectusFileName" TEXT,
ADD COLUMN     "prospectusUrl" TEXT;
