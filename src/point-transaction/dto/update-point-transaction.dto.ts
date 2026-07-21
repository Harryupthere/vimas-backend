import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PointTransactionReason } from '../../shared/entities/point-transaction.entity';

// Deliberately narrow — not PartialType(Create). Wallet identity fields
// (walletType/walletId/sourceUserId/sourceAdminId/transactionType) must never
// be edited on an existing ledger entry, only corrected via amount/reason/
// remarks (or removed and re-created).
export class UpdatePointTransactionDto {
  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsEnum(PointTransactionReason)
  @IsOptional()
  transactionReason?: PointTransactionReason;

  @IsString()
  @IsOptional()
  remarks?: string;
}
