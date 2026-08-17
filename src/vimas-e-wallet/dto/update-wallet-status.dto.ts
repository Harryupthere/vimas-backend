import { IsBoolean } from 'class-validator';

export class UpdateWalletStatusDto {
  @IsBoolean()
  isActive: boolean;
}
