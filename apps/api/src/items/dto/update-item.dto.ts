import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
