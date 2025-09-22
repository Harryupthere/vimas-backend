import {
  Controller,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Put,
  Delete,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CartService } from '../cart.service';
import { AddToCartDto, UpdateCartDto } from '../dto/cart.dto';
import { JwtAuthGuard } from '../../shared/auth/strategies/auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  addToCart(@Req() req, @Body() dto: AddToCartDto) {
    const buyerId = req.user.id;
    return this.cartService.addToCart(buyerId, dto);
  }

  @Put(':productId')
  updateCartItem(
    @Req() req,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateCartDto,
  ) {
    const buyerId = req.user.id;
    return this.cartService.updateCartItem(buyerId, productId, dto);
  }

  @Delete(':productId')
  removeFromCart(
    @Req() req,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const buyerId = req.user.id;
    return this.cartService.removeFromCart(buyerId, productId);
  }

  @Get()
  getCart(@Req() req) {
    const buyerId = req.user.id;
    return this.cartService.getCart(buyerId);
  }
}
