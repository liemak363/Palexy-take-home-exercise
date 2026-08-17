import { Injectable } from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { StaffQueryDto } from './dto/staff-query.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly staffRepository: StaffRepository) {}

  async findAll(query: StaffQueryDto) {
    return this.staffRepository.findAll(query);
  }

  async findById(id: number) {
    return this.staffRepository.findById(id);
  }

  async softDelete(id: number) {
    return this.staffRepository.softDelete(id);
  }

  async update(id: number, dto: UpdateStaffDto) {
    return this.staffRepository.update(id, dto);
  }

  async create(dto: CreateStaffDto) {
    return this.staffRepository.create(dto);
  }
}
