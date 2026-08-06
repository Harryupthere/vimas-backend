import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartType } from '../shared/entities/cart.entity';
import { AddToCartDto, UpdateCartDto } from './dto/cart.dto';
import { Product } from '../shared/entities/products.entity';
import { User } from '../shared/entities/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async addToCart(buyerId: number, dto: AddToCartDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    let cartItem = await this.cartRepo.findOne({
      where: { buyer: { id: buyerId }, product: { id: dto.productId } },
    });

    const cartType = dto.cart_type ?? CartType.CONSUMER;

    if (cartItem) {
      cartItem.quantity += dto.quantity;
      // let a later add-to-cart call switch the existing row's type
      // (e.g. buyer re-adds the same product as a reseller)
      cartItem.cart_type = cartType;
    } else {
      cartItem = this.cartRepo.create({
        buyer: { id: buyerId } as User,
        product,
        quantity: dto.quantity,
        cart_type: cartType,
        price_snapshot: product.sellingPrice,
        discount_snapshot: product.discountAmount ?? 0,
      });
    }

    return await this.cartRepo.save(cartItem);
  }

  async updateCartItem(buyerId: number, productId: number, dto: UpdateCartDto) {
    const cartItem = await this.cartRepo.findOne({
      where: { buyer: { id: buyerId }, product: { id: productId } },
    });
    if (!cartItem) throw new NotFoundException('Cart item not found');

    cartItem.quantity = dto.quantity;
    return await this.cartRepo.save(cartItem);
  }

  async removeFromCart(buyerId: number, productId: number) {
    const result = await this.cartRepo.delete({
      buyer: { id: buyerId },
      product: { id: productId },
    });
    if (result.affected === 0)
      throw new NotFoundException('Cart item not found');
    return { message: 'Item removed from cart' };
  }

  async getCart(buyerId: number) {
    const cart = await this.cartRepo.find({
      where: { buyer: { id: buyerId } },
    });
    return { data: cart, message: 'Cart retrieved successfully' };
  }
}
