import { IsOptional, IsArray, IsString } from 'class-validator';

export class MerchantUpdateProductActionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  merchantRemarks?: string[]; // merchant adds more remarks / responses
}
