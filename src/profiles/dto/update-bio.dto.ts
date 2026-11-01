import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateBioDto {
  @ApiProperty({ example: 'CBI consultant.' })
  @IsString()
  bio!: string;
}