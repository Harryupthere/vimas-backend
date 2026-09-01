import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../shared/entities/products.entity';
import { RewardMallProduct } from '../shared/entities/reward-mall-product.entity';
import { User } from '../shared/entities/user.entity';

// Dropdown categories on the frontend's overall-search bar. reseller/
// consumer/partner mirror the same *_available gating GET /products?type=
// already uses; reward_mall covers the reward mall catalogue; referral
// covers a caller's own direct downline (users.referral_id = caller id).
// 'all' (default) runs every category at once for a combined preview.
export type SearchType =
  | 'reseller'
  | 'consumer'
  | 'partner'
  | 'reward_mall'
  | 'referral'
  | 'all';

const PRODUCT_CATALOG_TYPES: SearchType[] = ['reseller', 'consumer', 'partner'];

// Frontend route (relative to its own base URL) + display label for each
// category's listing page — attached to every group/item below so the
// frontend can send the user straight there off this response alone,
// instead of hardcoding its own type -> route mapping.
const CATEGORY_ROUTES: Record<
  Exclude<SearchType, 'all'>,
  { label: string; route: string }
> = {
  consumer: { label: 'Consumer', route: 'dashboard/mall/consumer' },
  reseller: {
    label: 'Vimas Products',
    route: 'dashboard/mall/reseller/vimas-products',
  },
  partner: {
    label: 'Vimas Partner',
    route: 'dashboard/mall/reseller/vimas-partners',
  },
  reward_mall: { label: 'Reward Mall', route: 'dashboard/rewards' },
  referral: { label: 'Teammates', route: 'dashboard/teammates/level-1' },
};

// Every product/reward-mall-product text field the frontend expects a
// keyword to match against.
const PRODUCT_TEXT_SEARCH = `
  (product.name LIKE :search
    OR product.sub_title LIKE :search
    OR product.description LIKE :search
    OR product.information LIKE :search
    OR product.notes LIKE :search
    OR product.search_keywords LIKE :search)
`;

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(RewardMallProduct)
    private readonly rewardMallProductRepo: Repository<RewardMallProduct>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // Shared by the reseller/consumer/partner dropdown entries — same
  // *_available gating ProductsService.findAllProductsUsers uses, just
  // trimmed to the image/name/description card the search dropdown shows.
  private async searchProductsCatalog(
    type: 'reseller' | 'consumer' | 'partner',
    q: string | undefined,
    page: number,
    limit: number,
  ) {
    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.productMedia', 'media')
      .where('product.status = :status', { status: 1 })
      .orderBy('product.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type === 'reseller') {
      query.andWhere('product.bulk_available = 1');
    } else if (type === 'consumer') {
      query.andWhere('product.consumer_available = 1');
    } else if (type === 'partner') {
      query.andWhere('product.partner_available = 1');
    }

    if (q) {
      query.andWhere(PRODUCT_TEXT_SEARCH, { search: `%${q}%` });
    }

    const [rows, total] = await query.getManyAndCount();
    const { label, route } = CATEGORY_ROUTES[type];

    const items = rows.map((p) => ({
      id: p.id,
      name: p.name,
      subTitle: p.subTitle,
      description: p.description,
      category: p.category?.name ?? null,
      image: p.productMedia?.[0]?.media_url ?? null,
      sellingPrice: Number(p.sellingPrice),
      categoryLabel: label,
      route,
    }));

    return { type, categoryLabel: label, route, items, page, limit, total };
  }

  // Reward mall catalogue — same shape as the product catalog entries so
  // the frontend can render both under one card component.
  private async searchRewardMall(
    q: string | undefined,
    page: number,
    limit: number,
  ) {
    const query = this.rewardMallProductRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.media', 'media')
      .where('product.status = :status', { status: 1 })
      .orderBy('product.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (q) {
      query.andWhere(PRODUCT_TEXT_SEARCH, { search: `%${q}%` });
    }

    const [rows, total] = await query.getManyAndCount();
    const { label, route } = CATEGORY_ROUTES.reward_mall;

    const items = rows.map((p) => ({
      id: p.id,
      name: p.name,
      subTitle: p.subTitle,
      description: p.description,
      category: p.category?.name ?? null,
      image: p.media?.[0]?.mediaUrl ?? null,
      pointPrice: Number(p.pointPrice),
      categoryLabel: label,
      route,
    }));

    return {
      type: 'reward_mall' as const,
      categoryLabel: label,
      route,
      items,
      page,
      limit,
      total,
    };
  }

  // Referral category — only the caller's own direct downline
  // (users.referral_id = callerId), matched on name/username/unique id/
  // email. No image; the frontend renders these as a plain name/id row
  // rather than the product image card.
  private async searchReferrals(
    callerId: number,
    q: string | undefined,
    page: number,
    limit: number,
  ) {
    const query = this.userRepo
      .createQueryBuilder('user')
      .where('user.referral_id = :callerId', { callerId })
      .andWhere('user.is_admin_deleted = 0')
      .andWhere('user.is_self_deleted = 0')
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (q) {
      query.andWhere(
        `(user.first_name LIKE :search
          OR user.last_name LIKE :search
          OR user.username LIKE :search
          OR user.unique_user_id LIKE :search
          OR user.email LIKE :search)`,
        { search: `%${q}%` },
      );
    }

    const [rows, total] = await query.getManyAndCount();
    const { label, route } = CATEGORY_ROUTES.referral;

    const items = rows.map((u) => ({
      id: u.id,
      uniqueUserId: u.unique_user_id,
      username: u.username,
      firstName: u.first_name,
      lastName: u.last_name,
      fullName:
        [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || null,
      email: u.email,
      image: u.profile,
      status: u.status,
      categoryLabel: label,
      route,
    }));

    return {
      type: 'referral' as const,
      categoryLabel: label,
      route,
      items,
      page,
      limit,
      total,
    };
  }

  // Single overall-search entry point. type picks one dropdown category;
  // omitted (or 'all') runs every category with the same keyword and page/
  // limit, so the frontend can show a combined preview before the user
  // narrows to one tab.
  async search(
    callerId: number,
    type: SearchType = 'all',
    q: string | undefined,
    page: number,
    limit: number,
  ) {
    if (PRODUCT_CATALOG_TYPES.includes(type)) {
      const result = await this.searchProductsCatalog(
        type as 'reseller' | 'consumer' | 'partner',
        q,
        page,
        limit,
      );
      return { data: result, message: 'Search results fetched successfully' };
    }

    if (type === 'reward_mall') {
      const result = await this.searchRewardMall(q, page, limit);
      return { data: result, message: 'Search results fetched successfully' };
    }

    if (type === 'referral') {
      const result = await this.searchReferrals(callerId, q, page, limit);
      return { data: result, message: 'Search results fetched successfully' };
    }

    const [reseller, consumer, partner, rewardMall, referral] =
      await Promise.all([
        this.searchProductsCatalog('reseller', q, page, limit),
        this.searchProductsCatalog('consumer', q, page, limit),
        this.searchProductsCatalog('partner', q, page, limit),
        this.searchRewardMall(q, page, limit),
        this.searchReferrals(callerId, q, page, limit),
      ]);

    return {
      data: { reseller, consumer, partner, rewardMall, referral },
      message: 'Search results fetched successfully',
    };
  }
}
