import { IsInt, IsNotEmpty, IsString, Min, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(0)
  maxHour: number;
}
