import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../provider/prisma/prisma.service';
import { StaffQueryDto } from './dto/staff-query.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: StaffQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.staff.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.staff.count(),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: number) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      throw new NotFoundException(`Staff with id ${id} not found`);
    }
    return staff;
  }

  async softDelete(id: number) {
    return this.prisma.staff.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async update(id: number, dto: UpdateStaffDto) {
    return this.prisma.staff.update({
      where: { id },
      data: dto,
    });
  }

  async create(dto: CreateStaffDto) {
    return this.prisma.staff.create({
      data: {
        name: dto.name,
        maxHour: dto.maxHour,
      },
    });
  }
}
