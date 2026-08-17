import { Injectable } from '@nestjs/common';
import { ScheduleRepository } from './schedule.repository';
import { ScheduleQueryDto } from './dto/schedule-query.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async findAll(query: ScheduleQueryDto) {
    return this.scheduleRepository.findAll(query);
  }
}
