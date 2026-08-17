import { PartialType } from '@nestjs/mapped-types';
import { CreateProductAddOnDto } from './create-product-add-on.dto';

export class UpdateProductAddOnDto extends PartialType(CreateProductAddOnDto) {}
