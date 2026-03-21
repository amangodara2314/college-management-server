/*
  Warnings:

  - A unique constraint covering the columns `[studentId,documentTypeId]` on the table `StudentDocument` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileName` to the `StudentDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `StudentDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `format` to the `StudentDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StudentDocument" ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "format" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "StudentDocument_studentId_documentTypeId_key" ON "StudentDocument"("studentId", "documentTypeId");
