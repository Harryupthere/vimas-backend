import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewRating } from '../shared/entities/review-rating.entity';
import { Order } from '../shared/entities/order.entity';
import { CreateReviewRatingDto } from './dto/create-review-rating.dto';
import { UpdateReviewRatingDto } from './dto/update-review-rating.dto';
import { SetVisibilityDto } from './dto/set-visibility.dto';

@Injectable()
export class ReviewRatingService {
  constructor(
    @InjectRepository(ReviewRating)
    private readonly reviewRatingRepo: Repository<ReviewRating>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(userId: number, dto: CreateReviewRatingDto) {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (Number(order.buyerId) !== Number(userId)) {
      throw new ForbiddenException('You did not place this order');
    }
    if (Number(order.productId) !== Number(dto.productId)) {
      throw new BadRequestException(
        'This order does not contain the given product',
      );
    }

    try {
      const review = this.reviewRatingRepo.create({
        userId,
        productId: dto.productId,
        orderId: dto.orderId,
        rate: dto.rate,
        review: dto.review,
      });
      const saved = await this.reviewRatingRepo.save(review);
      return { data: saved, message: 'Review submitted successfully' };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('You have already reviewed this product');
      }
      throw err;
    }
  }

  async findForProduct(
    productId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const query = this.reviewRatingRepo
      .createQueryBuilder('review')
      .where('review.product_id = :productId', { productId })
      .andWhere('review.show_status = 1')
      .orderBy('review.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere('review.review LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        reviews: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Reviews fetched successfully',
    };
  }

  async findMine(userId: number, search?: string) {
    const query = this.reviewRatingRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.product', 'product')
      .where('review.user_id = :userId', { userId })
      .orderBy('review.id', 'DESC');

    if (search) {
      query.andWhere(
        '(review.review LIKE :search OR product.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Your reviews fetched successfully' };
  }

  async update(userId: number, id: number, dto: UpdateReviewRatingDto) {
    const review = await this.reviewRatingRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (Number(review.userId) !== Number(userId)) {
      throw new ForbiddenException('You cannot edit this review');
    }

    Object.assign(review, dto);
    await this.reviewRatingRepo.save(review);
    return { data: review, message: 'Review updated successfully' };
  }

  async remove(userId: number, id: number) {
    const review = await this.reviewRatingRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (Number(review.userId) !== Number(userId)) {
      throw new ForbiddenException('You cannot delete this review');
    }

    await this.reviewRatingRepo.remove(review);
    return { message: 'Review removed successfully' };
  }

  // Admin
  async findAll(page: number, limit: number, search?: string) {
    const query = this.reviewRatingRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.product', 'product')
      .orderBy('review.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        `(review.review LIKE :search
          OR product.name LIKE :search
          OR user.first_name LIKE :search
          OR user.last_name LIKE :search
          OR user.email LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        reviews: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Reviews fetched successfully',
    };
  }

  async setVisibility(id: number, dto: SetVisibilityDto) {
    const review = await this.reviewRatingRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    review.showStatus = dto.showStatus;
    await this.reviewRatingRepo.save(review);
    return { data: review, message: 'Review visibility updated successfully' };
  }

  async adminRemove(id: number) {
    const review = await this.reviewRatingRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    await this.reviewRatingRepo.remove(review);
    return { message: 'Review removed successfully' };
  }
}
