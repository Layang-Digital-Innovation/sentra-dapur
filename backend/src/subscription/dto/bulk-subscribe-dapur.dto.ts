import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class BulkSubscribeDapurDto {
  @IsUUID()
  labelId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one dapurUnitId is required' })
  @IsUUID('4', { each: true })
  dapurUnitIds: string[];

  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'price must be greater than 0' })
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoActivate?: boolean;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  period?: 'MONTHLY' | 'YEARLY';
}

export class OrgInvoiceForLabelDto {
  @IsUUID()
  labelId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one dapurUnitId is required' })
  @IsUUID('4', { each: true })
  dapurUnitIds: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerUser?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsIn(['MONTHLY', 'YEARLY'])
  period: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsIn(['xendit', 'manual'])
  provider?: 'xendit' | 'manual';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  paidBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  awaitingApproval?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  additionalSeats?: boolean;
}
