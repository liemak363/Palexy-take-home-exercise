import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScheduleService } from './schedule.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  async findAll(@Query() query: ScheduleQueryDto) {
    return this.scheduleService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Post(':id/upload-txns')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTxns(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Send a CSV as form field "file".',
      );
    }
    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV file.');
    }
    return this.scheduleService.uploadTxns(id, file.buffer);
  }
}
