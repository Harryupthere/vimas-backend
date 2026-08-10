import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../shared/entities/notification.entity';
import { NotificationCategory } from '../shared/entities/notification-category.entity';
import { NotificationType } from '../shared/entities/notification-type.entity';
import { NotificationPreference } from '../shared/entities/notification-preference.entity';
import { User } from '../shared/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { NotificationTypeName } from './notification-names';

// categoryName/typeName take `string` (not `NotificationCategoryName |
// string`) — the named constants are string literals, so the union with
// `string` was already redundant; callers can still pass either the
// constants from notification-names.ts or an arbitrary category/type name.
interface NotifyOneParams {
  userId: number;
  categoryName: string;
  typeName?: string;
  heading: string;
  subheading?: string;
  route?: string;
  data?: Record<string, any>;
}

interface NotifyAllParams {
  categoryName: string;
  typeName?: string;
  heading: string;
  subheading?: string;
  route?: string;
  data?: Record<string, any>;
}

// Broadcast inserts are chunked so a large user table never becomes one
// giant INSERT statement.
const BROADCAST_CHUNK_SIZE = 500;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationCategory)
    private readonly categoryRepo: Repository<NotificationCategory>,
    @InjectRepository(NotificationType)
    private readonly typeRepo: Repository<NotificationType>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ---------------------------------------------------------------------
  // Public API for other modules (orders, users, point-distribution,
  // products, reward-mall-products) to fire notifications from their own
  // business logic. Both are best-effort: a missing/misconfigured category
  // or type is logged and swallowed rather than thrown, so a notifications
  // hiccup never fails the purchase/registration/etc. it's piggybacking on.
  // ---------------------------------------------------------------------

  async notifyUser(params: NotifyOneParams): Promise<void> {
    const categoryId = await this.resolveCategoryId(params.categoryName);
    const typeId = await this.resolveTypeId(
      params.typeName ?? NotificationTypeName.GENERAL,
    );
    if (!categoryId || !typeId) return;

    try {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: params.userId,
          notificationCategoryId: categoryId,
          notificationTypeId: typeId,
          heading: params.heading,
          subheading: params.subheading,
          route: params.route,
          data: params.data,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `notifyUser failed for userId=${params.userId}, category=${params.categoryName}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async notifyAllUsers(params: NotifyAllParams): Promise<void> {
    const categoryId = await this.resolveCategoryId(params.categoryName);
    const typeId = await this.resolveTypeId(
      params.typeName ?? NotificationTypeName.GENERAL,
    );
    if (!categoryId || !typeId) return;

    try {
      const activeUsers = await this.userRepo
        .createQueryBuilder('user')
        .select('user.id', 'id')
        .where('user.status = 1')
        .andWhere('user.is_admin_deleted = 0')
        .andWhere('user.is_self_deleted = 0')
        .getRawMany<{ id: string }>();

      const userIds = activeUsers.map((u) => Number(u.id));
      if (!userIds.length) return;

      for (let i = 0; i < userIds.length; i += BROADCAST_CHUNK_SIZE) {
        const chunk = userIds.slice(i, i + BROADCAST_CHUNK_SIZE);
        const rows = chunk.map((userId) =>
          this.notificationRepo.create({
            userId,
            notificationCategoryId: categoryId,
            notificationTypeId: typeId,
            heading: params.heading,
            subheading: params.subheading,
            route: params.route,
            data: params.data,
          }),
        );
        await this.notificationRepo
          .createQueryBuilder()
          .insert()
          .into(Notification)
          .values(rows)
          .execute();
      }
    } catch (err) {
      this.logger.warn(
        `notifyAllUsers failed for category=${params.categoryName}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async resolveCategoryId(name: string): Promise<number | null> {
    const category = await this.categoryRepo.findOne({
      where: { name, status: 1 },
    });
    if (!category) {
      this.logger.warn(
        `Notification category "${name}" not found or inactive — skipping notification`,
      );
      return null;
    }
    return Number(category.id);
  }

  private async resolveTypeId(name: string): Promise<number | null> {
    const type = await this.typeRepo.findOne({ where: { name, status: 1 } });
    if (!type) {
      this.logger.warn(
        `Notification type "${name}" not found or inactive — skipping notification`,
      );
      return null;
    }
    return Number(type.id);
  }

  // ---------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------

  async adminCreate(dto: CreateNotificationDto) {
    if (!dto.broadcast && !dto.userId) {
      throw new BadRequestException(
        'Either userId or broadcast must be provided',
      );
    }
    if (dto.broadcast && dto.userId) {
      throw new BadRequestException(
        'Provide either userId or broadcast, not both',
      );
    }

    const category = await this.categoryRepo.findOne({
      where: { id: dto.notificationCategoryId },
    });
    if (!category)
      throw new NotFoundException('Notification category not found');

    const type = await this.typeRepo.findOne({
      where: { id: dto.notificationTypeId },
    });
    if (!type) throw new NotFoundException('Notification type not found');

    if (dto.broadcast) {
      await this.notifyAllUsers({
        categoryName: category.name,
        typeName: type.name,
        heading: dto.heading,
        subheading: dto.subheading,
        route: dto.route,
        data: dto.data,
      });
      return { message: 'Notification broadcast to all users successfully' };
    }

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const notification = this.notificationRepo.create({
      userId: dto.userId,
      notificationCategoryId: dto.notificationCategoryId,
      notificationTypeId: dto.notificationTypeId,
      heading: dto.heading,
      subheading: dto.subheading,
      route: dto.route,
      data: dto.data,
    });
    await this.notificationRepo.save(notification);
    return { data: notification, message: 'Notification sent successfully' };
  }

  async adminFindAll(
    page: number,
    limit: number,
    filters?: {
      userId?: number;
      categoryId?: number;
      typeId?: number;
      isRead?: number;
      search?: string;
    },
  ) {
    const query = this.notificationRepo
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .leftJoinAndSelect('notification.category', 'category')
      .leftJoinAndSelect('notification.type', 'type')
      .where('notification.is_admin_hidden = 0')
      .orderBy('notification.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters?.userId) {
      query.andWhere('notification.user_id = :userId', {
        userId: filters.userId,
      });
    }
    if (filters?.categoryId) {
      query.andWhere('notification.notification_category_id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters?.typeId) {
      query.andWhere('notification.notification_type_id = :typeId', {
        typeId: filters.typeId,
      });
    }
    if (filters?.isRead !== undefined) {
      query.andWhere('notification.is_read = :isRead', {
        isRead: filters.isRead,
      });
    }
    if (filters?.search) {
      query.andWhere(
        `(notification.heading LIKE :search
          OR notification.subheading LIKE :search
          OR user.first_name LIKE :search
          OR user.last_name LIKE :search
          OR user.email LIKE :search
          OR user.unique_user_id LIKE :search)`,
        { search: `%${filters.search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        notifications: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Notifications fetched successfully',
    };
  }

  async adminFindOne(id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id },
      relations: ['user', 'category', 'type'],
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return { data: notification, message: 'Notification' };
  }

  async adminUpdate(id: number, dto: UpdateNotificationDto) {
    const notification = await this.notificationRepo.findOne({
      where: { id },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    Object.assign(notification, dto);
    await this.notificationRepo.save(notification);
    return { data: notification, message: 'Notification updated successfully' };
  }

  // Admin-side "archive" — hides it from the admin list without touching
  // the target user's own view of it.
  async adminHide(id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    notification.isAdminHidden = 1;
    await this.notificationRepo.save(notification);
    return { message: 'Notification hidden successfully' };
  }

  async adminRemove(id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.notificationRepo.remove(notification);
    return { message: 'Notification removed successfully' };
  }

  // ---------------------------------------------------------------------
  // User
  // ---------------------------------------------------------------------

  // Preference filtering happens here, at read time (not at insert time) —
  // a notification row always gets written for every user regardless of
  // their preferences, so toggling a category on/off retroactively changes
  // what shows up here, past notifications included.
  async findMine(
    userId: number,
    page: number,
    limit: number,
    search?: string,
    unreadOnly?: boolean,
    categoryId?: number,
  ) {
    const query = this.notificationRepo
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.category', 'category')
      .leftJoinAndSelect('notification.type', 'type')
      .where('notification.user_id = :userId', { userId })
      .andWhere('notification.is_user_hidden = 0')
      .andWhere('notification.is_admin_hidden = 0')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM notification_preferences np
          WHERE np.user_id = :userId
            AND np.notification_category_id = notification.notification_category_id
            AND np.is_enabled = 0
        )`,
        { userId },
      )
      .orderBy('notification.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (categoryId) {
      query.andWhere('notification.notification_category_id = :categoryId', {
        categoryId,
      });
    }
    if (unreadOnly) {
      query.andWhere('notification.is_read = 0');
    }
    if (search) {
      query.andWhere(
        '(notification.heading LIKE :search OR notification.subheading LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        notifications: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Notifications fetched successfully',
    };
  }

  async findMineOne(userId: number, id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
      relations: ['category', 'type'],
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return { data: notification, message: 'Notification' };
  }

  async unreadCount(userId: number) {
    const count = await this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .andWhere('notification.is_read = 0')
      .andWhere('notification.is_user_hidden = 0')
      .andWhere('notification.is_admin_hidden = 0')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM notification_preferences np
          WHERE np.user_id = :userId
            AND np.notification_category_id = notification.notification_category_id
            AND np.is_enabled = 0
        )`,
        { userId },
      )
      .getCount();

    return { data: { count }, message: 'Unread notification count' };
  }

  async markRead(userId: number, id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    if (!notification.isRead) {
      notification.isRead = 1;
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
    }
    return { data: notification, message: 'Notification marked as read' };
  }

  async markAllRead(userId: number) {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: 1, readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = 0')
      .execute();

    return { message: 'All notifications marked as read' };
  }

  async hide(userId: number, id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    notification.isUserHidden = 1;
    await this.notificationRepo.save(notification);
    return { message: 'Notification hidden successfully' };
  }

  // ---------------------------------------------------------------------
  // User preferences — only categories with userPreference=true are
  // manageable; everything else is mandatory and never appears here.
  // ---------------------------------------------------------------------

  async getPreferences(userId: number) {
    const categories = await this.categoryRepo.find({
      where: { status: 1, userPreference: true },
      order: { id: 'ASC' },
    });

    if (!categories.length) {
      return {
        data: [],
        message: 'Notification preferences fetched successfully',
      };
    }

    const preferences = await this.preferenceRepo.find({
      where: { userId },
    });
    const preferenceByCategory = new Map(
      preferences.map((p) => [Number(p.notificationCategoryId), p]),
    );

    const data = categories.map((category) => {
      const preference = preferenceByCategory.get(Number(category.id));
      return {
        categoryId: Number(category.id),
        name: category.name,
        description: category.description,
        icon: category.icon,
        // no row yet => defaults to enabled (matches the column default)
        isEnabled: preference ? !!preference.isEnabled : true,
      };
    });

    return { data, message: 'Notification preferences fetched successfully' };
  }

  async updatePreference(
    userId: number,
    categoryId: number,
    dto: UpdateNotificationPreferenceDto,
  ) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category)
      throw new NotFoundException('Notification category not found');
    if (!category.userPreference) {
      throw new BadRequestException(
        'This notification category cannot be toggled by users',
      );
    }

    let preference = await this.preferenceRepo.findOne({
      where: { userId, notificationCategoryId: categoryId },
    });

    if (!preference) {
      preference = this.preferenceRepo.create({
        userId,
        notificationCategoryId: categoryId,
        isEnabled: dto.isEnabled ? 1 : 0,
      });
    } else {
      preference.isEnabled = dto.isEnabled ? 1 : 0;
    }

    await this.preferenceRepo.save(preference);
    return {
      data: {
        categoryId,
        isEnabled: !!preference.isEnabled,
      },
      message: 'Notification preference updated successfully',
    };
  }
}
