/*
  Warnings:

  - Added the required column `day_of_week` to the `shift` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "shift" ADD COLUMN     "day_of_week" "DayOfWeek" NOT NULL;
