import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProductFeedback,
  ProductFeedbackStatus,
} from '../shared/entities/product-feedback.entity';
import { ProductFeedbackLike } from '../shared/entities/product-feedback-like.entity';
import { Product } from '../shared/entities/products.entity';
import { CreateProductFeedbackDto } from './dto/create-product-feedback.dto';
import { UpdateProductFeedbackDto } from './dto/update-product-feedback.dto';
import { SetFeedbackStatusDto } from './dto/set-feedback-status.dto';

@Injectable()
export class ProductFeedbackService {
  constructor(
    @InjectRepository(ProductFeedback)
    private readonly feedbackRepo: Repository<ProductFeedback>,
    @InjectRepository(ProductFeedbackLike)
    private readonly feedbackLikeRepo: Repository<ProductFeedbackLike>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(userId: number, dto: CreateProductFeedbackDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    let parent: ProductFeedback | null = null;
    if (dto.parentFeedbackId) {
      parent = await this.feedbackRepo.findOne({
        where: { id: dto.parentFeedbackId },
      });
      if (!parent) {
        throw new NotFoundException('Feedback being replied to not found');
      }
      if (Number(parent.productId) !== Number(dto.productId)) {
        throw new BadRequestException(
          'Parent feedback does not belong to this product',
        );
      }
    }

    const feedback = this.feedbackRepo.create({
      productId: dto.productId,
      userId,
      parentFeedbackId: dto.parentFeedbackId ?? null,
      // a reply is a comment thread on a review, not a review itself
      rating: parent ? null : (dto.rating ?? null),
      comment: dto.comment,
    });
    const saved = await this.feedbackRepo.save(feedback);

    if (parent) {
      await this.feedbackRepo.increment({ id: parent.id }, 'replyCount', 1);
    }

    return { data: saved, message: 'Feedback submitted successfully' };
  }

  async findForProduct(
    productId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const query = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .where('feedback.product_id = :productId', { productId })
      .andWhere('feedback.parent_feedback_id IS NULL')
      .andWhere('feedback.status = :status', {
        status: ProductFeedbackStatus.ACTIVE,
      })
      .orderBy('feedback.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere('feedback.comment LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        feedback: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Feedback fetched successfully',
    };
  }

  async findReplies(
    feedbackId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const parent = await this.feedbackRepo.findOne({
      where: { id: feedbackId },
    });
    if (!parent) throw new NotFoundException('Feedback not found');

    const query = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .where('feedback.parent_feedback_id = :feedbackId', { feedbackId })
      .andWhere('feedback.status = :status', {
        status: ProductFeedbackStatus.ACTIVE,
      })
      .orderBy('feedback.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere('feedback.comment LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        replies: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Replies fetched successfully',
    };
  }

  async findMine(userId: number, page: number, limit: number, search?: string) {
    const query = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.product', 'product')
      .where('feedback.user_id = :userId', { userId })
      .orderBy('feedback.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(feedback.comment LIKE :search OR product.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        feedback: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Your feedback fetched successfully',
    };
  }

  async update(userId: number, id: number, dto: UpdateProductFeedbackDto) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Feedback not found');
    if (Number(feedback.userId) !== Number(userId)) {
      throw new ForbiddenException('You cannot edit this feedback');
    }

    Object.assign(feedback, dto);
    await this.feedbackRepo.save(feedback);
    return { data: feedback, message: 'Feedback updated successfully' };
  }

  // Soft delete — a hard delete here would cascade (FK ON DELETE CASCADE)
  // and wipe out every reply/like left by *other* users under this feedback.
  async remove(userId: number, id: number) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Feedback not found');
    if (Number(feedback.userId) !== Number(userId)) {
      throw new ForbiddenException('You cannot delete this feedback');
    }

    feedback.status = ProductFeedbackStatus.DELETED;
    await this.feedbackRepo.save(feedback);
    return { message: 'Feedback removed successfully' };
  }

  async like(userId: number, feedbackId: number) {
    const feedback = await this.feedbackRepo.findOne({
      where: { id: feedbackId },
    });
    if (!feedback) throw new NotFoundException('Feedback not found');

    try {
      const like = this.feedbackLikeRepo.create({ feedbackId, userId });
      await this.feedbackLikeRepo.save(like);
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('You already liked this feedback');
      }
      throw err;
    }

    await this.feedbackRepo.increment({ id: feedbackId }, 'likeCount', 1);
    return { message: 'Feedback liked successfully' };
  }

  async unlike(userId: number, feedbackId: number) {
    const result = await this.feedbackLikeRepo.delete({ feedbackId, userId });
    if (result.affected === 0) {
      throw new NotFoundException('You have not liked this feedback');
    }

    await this.feedbackRepo.decrement({ id: feedbackId }, 'likeCount', 1);
    return { message: 'Feedback unliked successfully' };
  }

  // Admin
  async findAll(
    page: number,
    limit: number,
    filters?: {
      productId?: number;
      status?: ProductFeedbackStatus;
      search?: string;
    },
  ) {
    const query = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .leftJoinAndSelect('feedback.product', 'product')
      .orderBy('feedback.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters?.productId) {
      query.andWhere('feedback.product_id = :productId', {
        productId: filters.productId,
      });
    }
    if (filters?.status) {
      query.andWhere('feedback.status = :status', { status: filters.status });
    }
    if (filters?.search) {
      query.andWhere(
        `(feedback.comment LIKE :search
          OR product.name LIKE :search
          OR user.first_name LIKE :search
          OR user.last_name LIKE :search
          OR user.email LIKE :search)`,
        { search: `%${filters.search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        feedback: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Feedback fetched successfully',
    };
  }

  async findOne(id: number) {
    const feedback = await this.feedbackRepo.findOne({
      where: { id },
      relations: ['user', 'product', 'parentFeedback'],
    });
    if (!feedback) throw new NotFoundException('Feedback not found');
    return { data: feedback, message: 'Feedback' };
  }

  async setStatus(id: number, dto: SetFeedbackStatusDto) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Feedback not found');

    feedback.status = dto.status;
    await this.feedbackRepo.save(feedback);
    return { data: feedback, message: 'Feedback status updated successfully' };
  }

  async adminRemove(id: number) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Feedback not found');

    await this.feedbackRepo.remove(feedback);
    return { message: 'Feedback removed successfully' };
  }
}
