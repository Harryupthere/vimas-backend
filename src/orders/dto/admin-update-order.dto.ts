import { IsInt, IsOptional } from 'class-validator';

export class AdminUpdateOrderDto {
  @IsInt()
  @IsOptional()
  orderStatusId?: number;

  @IsInt()
  @IsOptional()
  paymentStatusId?: number;
}
