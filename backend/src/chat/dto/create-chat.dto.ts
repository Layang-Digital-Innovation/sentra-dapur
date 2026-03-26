import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ChatType } from '@prisma/client';

export class CreateChatDto {
  @IsOptional()
  @IsString()
  adminId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType;
}