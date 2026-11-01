import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserProfileDto {
  @ApiProperty({ example: 'patrick_jane' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Patrick Jane' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: ['crime', 'redjohn'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isPrivate?: boolean;
}