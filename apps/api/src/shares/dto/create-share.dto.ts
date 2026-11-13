import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShareDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsOptional()
  expiresAt?: string; // ISO 8601 date string
}
