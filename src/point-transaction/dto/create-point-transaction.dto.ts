import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  PointTransactionReason,
  PointTransactionType,
  PointWalletType,
} from '../../shared/entities/point-transaction.entity';

export class CreatePointTransactionDto {
  @IsEnum(PointWalletType)
  walletType: PointWalletType;

  @IsInt()
  @IsNotEmpty()
  walletId: number;

  @IsEnum(PointTransactionType)
  transactionType: PointTransactionType;

  @IsEnum(PointTransactionReason)
  transactionReason: PointTransactionReason;

  @IsInt()
  @IsOptional()
  sourceUserId?: number;

  @IsInt()
  @IsOptional()
  sourceAdminId?: number;

  @IsInt()
  @IsOptional()
  productId?: number;

  @IsInt()
  @IsOptional()
  orderId?: number;

  @IsInt()
  @IsOptional()
  pointDistributionId?: number;

  @IsInt()
  @IsOptional()
  poolId?: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}
