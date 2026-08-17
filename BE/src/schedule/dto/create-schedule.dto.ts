import { IsDateString, IsNotEmpty } from 'class-validator';

export class CreateScheduleDto {
  /**
   * An arbitrary date in ISO format (YYYY-MM-DD).
   * The backend will snap it to the nearest previous (or same) Monday.
   */
  @IsNotEmpty()
  @IsDateString()
  startDate: string;
}
