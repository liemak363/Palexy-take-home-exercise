import { Controller, Get, Query } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  async findAll(@Query() query: ScheduleQueryDto) {
    return this.scheduleService.findAll(query);
  }
}
