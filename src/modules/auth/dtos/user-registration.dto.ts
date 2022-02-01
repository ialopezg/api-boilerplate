import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';

export class UserRegistrationDto {
  @ApiProperty({ description: 'User first name' })
  @IsString()
  @IsNotEmpty()
  readonly firstName: string;

  @ApiProperty({ description: 'User last name' })
  @IsString()
  @IsNotEmpty()
  readonly lastName: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  readonly password: string;

  @ApiPropertyOptional({ description: 'User currency' })
  @IsString()
  @IsOptional()
  readonly currency?: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  @IsPhoneNumber()
  @IsOptional()
  readonly phone?: string;
}
