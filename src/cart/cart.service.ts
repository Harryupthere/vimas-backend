import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cart, CartType } from '../shared/entities/cart.entity';
import { AddToCartDto, UpdateCartDto } from './dto/cart.dto';
import { Product } from '../shared/entities/products.entity';
import { ProductBulkDetail } from '../shared/entities/product-bulk-detail.entity';
import { User } from '../shared/entities/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductBulkDetail)
    private readonly bulkDetailRepo: Repository<ProductBulkDetail>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // Quantity bounds for a product depend on which cart_type the line is
  // for — separate columns on products for consumer/reseller/partner. For
  // reseller, "quantity" means package count, not product units: a package
  // is treated as one unit of quantity regardless of how many items it
  // physically contains (see product_bulk_details.package_quantity).
  private getQuantityBounds(product: Product, cartType: CartType) {
    if (cartType === CartType.RESELLER) {
      return {
        min: product.resellerMinimumQuantity,
        max: product.resellerMaximumQuantity,
      };
    }
    if (cartType === CartType.PARTNER) {
      return {
        min: product.partnerMinimumQuantity,
        max: product.partnerMaximumQuantity,
      };
    }
    return {
      min: product.consumerMinimumQuantity,
      max: product.consumerMaximumQuantity,
    };
  }

  // Every cart row this buyer already has for this product+type. Consumer
  // has at most one (productBulkDetailsId is always null for it). Reseller
  // can have several — one per distinct bulk package the buyer has picked
  // — since a different productBulkDetailsId is a different cart row, not
  // an overwrite of the same one (see the cart_type + productBulkDetailsId
  // part of the DB's unique key).
  private async getRowsForProduct(
    buyerId: number,
    productId: number,
    cartType: CartType,
  ) {
    return this.cartRepo.find({
      where: {
        buyer: { id: buyerId },
        product: { id: productId },
        cart_type: cartType,
      },
    });
  }

  async addToCart(buyerId: number, dto: AddToCartDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const cartType = dto.cart_type ?? CartType.CONSUMER;

    // Partner is mutually exclusive with consumer/reseller for the same
    // product — a buyer can still hold a consumer row AND a reseller row
    // for the same product at once (unchanged), but adding as partner is
    // blocked if either already exists.
    if (cartType === CartType.PARTNER) {
      const conflictingRow = await this.cartRepo.findOne({
        where: {
          buyer: { id: buyerId },
          product: { id: dto.productId },
          cart_type: In([CartType.CONSUMER, CartType.RESELLER]),
        },
      });
      if (conflictingRow) {
        throw new BadRequestException(
          `Can not add same product from ${conflictingRow.cart_type} and partner`,
        );
      }
    }

    // Reseller lines must reference a real, active bulk package belonging
    // to this product; consumer lines never carry one.
    let productBulkDetailsId: number | null = null;
    if (cartType === CartType.RESELLER) {
      if (!dto.productBulkDetailsId) {
        throw new BadRequestException(
          'productBulkDetailsId is required for reseller cart items',
        );
      }
      const bulkDetail = await this.bulkDetailRepo.findOne({
        where: {
          id: dto.productBulkDetailsId,
          productId: dto.productId,
          status: 1,
        },
      });
      if (!bulkDetail) {
        throw new NotFoundException('Bulk package not found for this product');
      }
      productBulkDetailsId = bulkDetail.id;
    }

    const existingRows = await this.getRowsForProduct(
      buyerId,
      dto.productId,
      cartType,
    );

    // consumer_min/max or reseller_min/max bounds the TOTAL across every
    // row this buyer has for this product+type — for reseller that's the
    // sum across all their selected packages, not just the one this add
    // targets, matching "2 different packages or the same package twice
    // both count toward the same cap."
    const currentTotalQty = existingRows.reduce(
      (sum, row) => sum + row.quantity,
      0,
    );

    let newTotalQty = 0;

    if (cartType === CartType.RESELLER && productBulkDetailsId) {
      newTotalQty = existingRows.reduce((sum, row) => {
        if (row.productBulkDetailsId === productBulkDetailsId) {
          return  row.quantity + 1;
        }
        return 1;
      }, 1);
    } else {
      newTotalQty = currentTotalQty + dto.quantity;
    }

    const { min, max } = this.getQuantityBounds(product, cartType);
    if (newTotalQty < min || newTotalQty > max) {
      throw new BadRequestException(
        `Quantity for this ${cartType} item must be between ${min} and ${max} (you'd have ${newTotalQty}).`,
      );
    }

    // The specific row this add targets: the existing row for this exact
    // package (reseller), or the buyer's only row for this product
    // (consumer, where productBulkDetailsId is always null on both sides).
    let cartItem = existingRows.find(
      (row) => row.productBulkDetailsId === productBulkDetailsId,
    );

    if (cartItem) {
      cartItem.quantity = newTotalQty;
    } else {
      cartItem = this.cartRepo.create({
        buyer: { id: buyerId } as User,
        product,
        quantity: newTotalQty,
        cart_type: cartType,
        productBulkDetailsId,
        price_snapshot: product.sellingPrice,
        discount_snapshot: product.discountAmount ?? 0,
      });
    }

    return await this.cartRepo.save(cartItem);
  }

  async updateCartItem(buyerId: number, productId: number, dto: UpdateCartDto) {
    const cartType = dto.cart_type ?? CartType.CONSUMER;

    if (cartType === CartType.RESELLER && !dto.productBulkDetailsId) {
      throw new BadRequestException(
        'productBulkDetailsId is required to identify which reseller package to update',
      );
    }

    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    let targetBulkDetailsId: number | null = null;
    if (cartType === CartType.RESELLER) {
      const bulkDetail = await this.bulkDetailRepo.findOne({
        where: {
          id: dto.productBulkDetailsId,
          productId,
          status: 1,
        },
      });
      if (!bulkDetail) {
        throw new NotFoundException('Bulk package not found for this product');
      }
      targetBulkDetailsId = bulkDetail.id;
    }

    const existingRows = await this.getRowsForProduct(
      buyerId,
      productId,
      cartType,
    );
    const cartItem = existingRows.find(
      (row) => row.productBulkDetailsId === targetBulkDetailsId,
    );
    if (!cartItem) throw new NotFoundException('Cart item not found');

    // Same newTotalQty shape as addToCart: bound the TOTAL across every row
    // this buyer has for this product+type — the row being touched
    // contributes its new (set, not added) value, every sibling package's
    // row keeps contributing its own current quantity.
    const newTotalQty = existingRows.reduce((sum, row) => {
      if (row.productBulkDetailsId === targetBulkDetailsId) {
        return sum + dto.quantity;
      }
      return sum + row.quantity;
    }, 0);

    const { min, max } = this.getQuantityBounds(product, cartType);
    if (newTotalQty < min || newTotalQty > max) {
      throw new BadRequestException(
        `Quantity for this ${cartType} item must be between ${min} and ${max} (you'd have ${newTotalQty} in total).`,
      );
    }

    cartItem.quantity = dto.quantity;
    return await this.cartRepo.save(cartItem);
  }

  async removeFromCart(
    buyerId: number,
    productId: number,
    cartType: CartType = CartType.CONSUMER,
    productBulkDetailsId?: number,
  ) {
    // Reseller can have several rows (one per package) for the same
    // product — productBulkDetailsId says which one to remove, so it
    // doesn't accidentally wipe every package the buyer picked.
    if (cartType === CartType.RESELLER && !productBulkDetailsId) {
      throw new BadRequestException(
        'productBulkDetailsId is required to identify which reseller package to remove',
      );
    }

    const result = await this.cartRepo.delete({
      buyer: { id: buyerId },
      product: { id: productId },
      cart_type: cartType,
      ...(cartType === CartType.RESELLER ? { productBulkDetailsId } : {}),
    });
    if (result.affected === 0)
      throw new NotFoundException('Cart item not found');
    return { message: 'Item removed from cart' };
  }

  async getCart(buyerId: number) {
    const cart = await this.cartRepo.find({
      where: { buyer: { id: buyerId } },
      relations: ['productBulkDetails'],
    });
    return { data: cart, message: 'Cart retrieved successfully' };
  }
}
