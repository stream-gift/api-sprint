import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsIn(['development', 'production'])
  ENV: string;

  @IsNumber()
  @IsOptional()
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  SOLANA_WS_ENDPOINT: string;

  @IsString()
  SOLANA_HTTP_ENDPOINT: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
