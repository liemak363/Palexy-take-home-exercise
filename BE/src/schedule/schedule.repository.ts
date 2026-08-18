import { Injectable } from '@nestjs/common';
import { PrismaService } from '../provider/prisma/prisma.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
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

  async findShiftsById(id: number) {
    return this.prisma.schedule.findUnique({
      where: { id },
      select: {
        id: true,
        startDate: true,
        shiftDefinition: true,
        shifts: true,
      },
    });
  }

  async updateShiftDefinition(id: number, definition: ShiftDefinition) {
    return this.prisma.schedule.update({
      where: { id },
      data: { shiftDefinition: definition as object },
    });
  }
}
