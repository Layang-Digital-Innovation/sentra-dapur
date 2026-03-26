// ===== dto/send-message.dto.ts =====
import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '@prisma/client';

export class AttachmentDto {
  @IsString()
  fileName: string;

  @IsString()
  originalName: string;

  @IsString()
  fileSize: number;

  @IsString()
  mimeType: string;

  @IsString()
  fileUrl: string;
}
