import { PartialType } from '@nestjs/mapped-types';
import { CreateProductBulkDetailDto } from './create-product-bulk-detail.dto';

export class UpdateProductBulkDetailDto extends PartialType(
  CreateProductBulkDetailDto,
) {}
