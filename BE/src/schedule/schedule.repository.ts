import { Injectable } from '@nestjs/common';
import { PrismaService } from '../provider/prisma/prisma.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';

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
}
