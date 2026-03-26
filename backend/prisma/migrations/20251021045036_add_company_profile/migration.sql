/*
  Warnings:

  - You are about to drop the column `city` on the `SellerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `SellerProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SellerProfile" DROP COLUMN "city",
DROP COLUMN "province",
ADD COLUMN     "companyLogo" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "descriptions" TEXT,
ADD COLUMN     "profileCompanyFileName" TEXT,
ADD COLUMN     "profileCompanyUrl" TEXT;
