import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  Matches,
  ValidateNested,
} from 'class-validator';
import { DayOfWeek } from '../types/common.type';

export class ConfirmAssignmentDto {
  @IsEnum([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ])
  dayOfWeek: DayOfWeek;

  @Matches(/^\d{2}:00$/, {
    message: 'start must be in HH:00 format (e.g. "07:00")',
  })
  start: string;

  @Matches(/^\d{2}:00$/, {
    message: 'end must be in HH:00 format (e.g. "15:00")',
  })
  end: string;

  @IsInt()
  staffId: number;
}

export class ConfirmScheduleDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ConfirmAssignmentDto)
  assignments: ConfirmAssignmentDto[];
}
