import { IsInt, IsNotEmpty } from 'class-validator';

// Merchant-facing: intentionally exposes ONLY orderStatusId.
// Merchants must never be able to set paymentStatusId directly.
export class UpdateOrderStatusDto {
  @IsInt()
  @IsNotEmpty()
  orderStatusId: number;
}
