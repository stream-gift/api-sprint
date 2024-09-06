import { Currency } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDonationDto {
  @MaxLength(280)
  message: string;

  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  @IsEnum(Currency)
  currency: Currency;
}
