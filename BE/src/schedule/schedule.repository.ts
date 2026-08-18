import { Injectable } from '@nestjs/common';
import { PrismaService } from '../provider/prisma/prisma.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { DayOfWeek, DayOfWeekEnum } from './types/common.type';
import { UploadedTransactions } from './types/uploaded-transactions.type';
import { ShiftDefinition } from './types/shift-definition.type';

@Injectable()
export class ScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ScheduleQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.schedule.findMany({
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.schedule.count(),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.schedule.findUnique({ where: { id } });
  }

  async create(startDate: Date, shiftDefinition: ShiftDefinition) {
    return this.prisma.schedule.create({
      data: { startDate, shiftDefinition: shiftDefinition as object },
    });
  }

  async updateUploadedTxns(id: number, txns: UploadedTransactions) {
    return this.prisma.schedule.update({
      where: { id },
      data: { uploadedTxns: txns as object },
    });
  }

  /** Returns shifts with their current assignments (including staff details). */
  async findShiftsById(id: number) {
    return this.prisma.schedule.findUnique({
      where: { id },
      select: {
        id: true,
        startDate: true,
        shiftDefinition: true,
        shifts: {
          include: {
            assignments: {
              include: { staff: true },
            },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { start: 'asc' }],
        },
      },
    });
  }

  async updateShiftDefinition(id: number, definition: ShiftDefinition) {
    return this.prisma.schedule.update({
      where: { id },
      data: { shiftDefinition: definition as object },
    });
  }

  // ---------------------------------------------------------------------------
  // Auto-schedule helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the schedule with its uploadedTxns and shiftDefinition.
   * Used by the auto-schedule algorithm.
   */
  async findScheduleForAutoSchedule(id: number) {
    return this.prisma.schedule.findUnique({
      where: { id },
      select: {
        id: true,
        uploadedTxns: true,
        shiftDefinition: true,
      },
    });
  }

  /** Returns all non-deleted staff (global pool for auto-scheduling). */
  async findAllActiveStaff() {
    return this.prisma.staff.findMany({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  /** Reads the N (transactions-per-staff-hour) constant from the Config table. */
  async findTransactionsPerStaffHour(): Promise<number> {
    const config = await this.prisma.config.findUnique({
      where: { key: 'TRANSACTIONS_PER_STAFF_HOUR' },
    });
    if (!config) return 15;
    const parsed = Number(config.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
  }

  /** Deletes all Shift rows for a schedule (cascades to ShiftAssignment). */
  async deleteAllShifts(scheduleId: number): Promise<void> {
    await this.prisma.shift.deleteMany({ where: { scheduleId } });
  }

  /**
   * Persists confirmed draft assignments:
   * 1. Deletes all existing Shift rows for scheduleId (cascades to ShiftAssignment)
   * 2. Creates Shift rows for each day of week (MONDAY..SUNDAY) x defined slots
   * 3. Creates ShiftAssignment rows for the confirmed assignments
   * Wrapped in a single transaction.
   */
  async replaceScheduleShiftsAndAssignments(
    scheduleId: number,
    shiftDefinition: ShiftDefinition,
    assignments: {
      dayOfWeek: DayOfWeek;
      start: string;
      end: string;
      staffId: number;
    }[],
  ) {
    const ALL_DAYS: DayOfWeek[] = Object.values(DayOfWeekEnum);

    const slots =
      shiftDefinition && shiftDefinition.length > 0
        ? shiftDefinition
        : [
            { start: '07:00', end: '15:00' },
            { start: '15:00', end: '23:00' },
          ];

    return this.prisma.$transaction(async (tx) => {
      // Delete existing Shift rows (cascades to ShiftAssignment)
      await tx.shift.deleteMany({ where: { scheduleId } });

      // Recreate Shift rows
      const createdShifts: {
        id: number;
        dayOfWeek: DayOfWeek;
        start: string;
        end: string;
      }[] = [];

      for (const dayOfWeek of ALL_DAYS) {
        for (const slot of slots) {
          const created = await tx.shift.create({
            data: {
              scheduleId,
              dayOfWeek,
              start: slot.start,
              end: slot.end,
            },
          });
          createdShifts.push({
            id: created.id,
            dayOfWeek: created.dayOfWeek as DayOfWeek,
            start: created.start,
            end: created.end,
          });
        }
      }

      // Create ShiftAssignment rows for confirmed assignments
      if (assignments.length > 0) {
        const assignmentData: { shiftId: number; staffId: number }[] = [];

        for (const a of assignments) {
          const matchingShift = createdShifts.find(
            (s) =>
              s.dayOfWeek === a.dayOfWeek &&
              s.start === a.start &&
              s.end === a.end,
          );

          if (matchingShift) {
            assignmentData.push({
              shiftId: matchingShift.id,
              staffId: a.staffId,
            });
          }
        }

        if (assignmentData.length > 0) {
          await tx.shiftAssignment.createMany({
            data: assignmentData,
            skipDuplicates: true,
          });
        }
      }
    });
  }
}
