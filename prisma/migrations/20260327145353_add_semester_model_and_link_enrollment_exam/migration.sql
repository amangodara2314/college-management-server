/*
  Warnings:

  - Added required column `semesterId` to table `Enrollment` without a default value. This fails if table is not empty.
  - Added required column `semesterId` to table `Exam` without a default value. This fails if table is not empty.

*/

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Semester_sessionId_number_key" ON "Semester"("sessionId", "number");

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "semesterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "semester",
ADD COLUMN "semesterId" TEXT NOT NULL;

-- DropIndex
DROP INDEX "Enrollment_admissionId_sessionId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_admissionId_semesterId_key" ON "Enrollment"("admissionId", "semesterId");

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
