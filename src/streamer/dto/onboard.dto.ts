import {
  IsEmpty,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';

import { PublicKey } from '@solana/web3.js';

export class OnboardDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @Validate((address: string) => {
    try {
      return PublicKey.isOnCurve(new PublicKey(address));
    } catch (error) {
      return false;
    }
  })
  address: string;

  @IsUrl()
  @Validate((url: string) => url.startsWith('https://utfs.io/f/'))
  profileImage: string;

  @Validate((url: string) => url === '' || url.startsWith('https://utfs.io/f/'))
  profileBanner: string;

  @IsString()
  @Validate(
    (color: string) =>
      color.startsWith('#') || color.startsWith('linear-gradient'),
  )
  profileColor: string;
}
