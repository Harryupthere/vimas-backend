import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from '../shared/entities/user_session.entity';

@Injectable()
export class UserSessionsService {
  constructor(
    @InjectRepository(UserSession)
    private readonly userSessionRepo: Repository<UserSession>,
  ) {}

  // Admin — every user's sessions, searchable by the owning user's
  // identity as well as the session's own device/network fields.
  async findAll(page: number, limit: number, search?: string) {
    const query = this.userSessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .orderBy('session.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        `(session.device_id LIKE :search
          OR session.ip_address LIKE :search
          OR session.user_agent LIKE :search
          OR user.first_name LIKE :search
          OR user.last_name LIKE :search
          OR user.email LIKE :search
          OR user.unique_user_id LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        sessions: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'User sessions fetched successfully',
    };
  }

  async findOne(id: number) {
    const session = await this.userSessionRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!session) throw new NotFoundException('User session not found');
    return { data: session, message: 'User session' };
  }

  // "my sessions" — scoped to the logged-in user's own sessions only. In
  // practice this is 0-or-1 rows today (login deletes the previous session
  // for that user before creating a new one — see UsersService.issueTokens
  // call sites), but built as a proper paginated/searchable list so it
  // keeps working unchanged if that single-active-session rule ever
  // relaxes to allow concurrent sessions.
  async findMine(userId: number, page: number, limit: number, search?: string) {
    const query = this.userSessionRepo
      .createQueryBuilder('session')
      .where('session.user_id = :userId', { userId })
      .orderBy('session.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        `(session.device_id LIKE :search
          OR session.ip_address LIKE :search
          OR session.user_agent LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data: {
        sessions: data,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Your sessions fetched successfully',
    };
  }

  async findMineOne(userId: number, id: number) {
    const session = await this.userSessionRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!session) throw new NotFoundException('User session not found');
    return { data: session, message: 'User session' };
  }
}
