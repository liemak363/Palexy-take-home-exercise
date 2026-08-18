import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  Matches,
  ValidateNested,
} from 'class-validator';

export class ShiftSlotDto {
  /** "HH:00", e.g. "07:00" */
  @Matches(/^\d{2}:00$/, {
    message: 'start must be in HH:00 format (e.g. "07:00")',
  })
  start: string;

  /** "HH:00", e.g. "15:00" */
  @Matches(/^\d{2}:00$/, {
    message: 'end must be in HH:00 format (e.g. "15:00")',
  })
  end: string;
}

export class UpdateShiftDefinitionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one shift is required.' })
  @ValidateNested({ each: true })
  @Type(() => ShiftSlotDto)
  shifts: ShiftSlotDto[];
}
