import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScheduleService } from './schedule.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateShiftDefinitionDto } from './dto/update-shift-definition.dto';
import { ConfirmScheduleDto } from './dto/confirm-schedule.dto';

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

  @Get(':id/shifts')
  async findShiftsById(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findShiftsById(id);
  }

  @Put(':id/shift-definition')
  async updateShiftDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShiftDefinitionDto,
  ) {
    return this.scheduleService.updateShiftDefinition(id, dto);
  }

  // ---------------------------------------------------------------------------
  // Auto-schedule
  // ---------------------------------------------------------------------------

  @Post(':id/auto-schedule')
  @HttpCode(HttpStatus.OK)
  async autoSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.autoSchedule(id);
  }

  @Post(':id/confirm-schedule')
  @HttpCode(HttpStatus.OK)
  async confirmSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmScheduleDto,
  ) {
    await this.scheduleService.confirmSchedule(id, dto);
    return { message: 'Schedule confirmed and saved successfully.' };
  }
}
