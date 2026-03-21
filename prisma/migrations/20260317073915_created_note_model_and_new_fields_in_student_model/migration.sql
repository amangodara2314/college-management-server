/*
  Warnings:

  - Added the required column `category` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `religion` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resourceType` to the `StudentDocument` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('GENERAL', 'OBC', 'SC', 'ST');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('HINDU', 'SIKH', 'MUSLIM', 'CHRISTIAN', 'BUDDHIST', 'JAIN');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "aadhar" TEXT,
ADD COLUMN     "category" "Category" NOT NULL,
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "janAadhar" TEXT,
ADD COLUMN     "otr" TEXT,
ADD COLUMN     "religion" "Religion" NOT NULL,
ADD COLUMN     "ssoId" TEXT,
ADD COLUMN     "ssoIdPassword" TEXT,
ADD COLUMN     "subCategory" TEXT;

-- AlterTable
ALTER TABLE "StudentDocument" ADD COLUMN     "resourceType" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
