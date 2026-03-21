/*
  Warnings:

  - You are about to drop the `CourseSubject` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CourseSubject" DROP CONSTRAINT "CourseSubject_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CourseSubject" DROP CONSTRAINT "CourseSubject_subjectId_fkey";

-- DropTable
DROP TABLE "CourseSubject";
