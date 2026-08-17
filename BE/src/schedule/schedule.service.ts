import { Injectable } from '@nestjs/common';
import { ScheduleRepository } from './schedule.repository';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async findAll(query: ScheduleQueryDto) {
    return this.scheduleRepository.findAll(query);
  }

  async create(dto: CreateScheduleDto) {
    // Parse the date parts from the ISO string without timezone involvement.
    // The client sends "YYYY-MM-DD"; we treat it as a plain local-calendar date.
    const [year, month, day] = dto.startDate.split('-').map(Number);

    // Build a Date using UTC midnight to avoid any DST/timezone shifts.
    const inputDate = new Date(Date.UTC(year, month - 1, day));

    // Snap to the nearest previous (or same-day) Monday.
    // getUTCDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayOfWeek = inputDate.getUTCDay();
    // Days to subtract to reach Monday: Mon=0, Tue=1, ..., Sun=6
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(inputDate);
    monday.setUTCDate(inputDate.getUTCDate() - daysToSubtract);

    return this.scheduleRepository.create(monday);
  }
}
