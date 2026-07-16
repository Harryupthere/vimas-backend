import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserType } from '../shared/entities/user_types.entity';
import { CreateUserTypeDto } from './dto/create-user-type.dto';
import { UpdateUserTypeDto } from './dto/update-user-type.dto';

@Injectable()
export class UserTypesService {
  constructor(
    @InjectRepository(UserType)
    private readonly userTypeRepo: Repository<UserType>,
  ) {}

  async create(
    role: string,
    user_id: number,
    dto: CreateUserTypeDto,
  ): Promise<any> {
    if (role !== 'admin') {
      throw new NotFoundException('Only admins can create products');
    }
    const userType = this.userTypeRepo.create(dto);
    await this.userTypeRepo.save(userType);
    return { message: 'User type created' };
  }

  async findAll(page: number, limit: number, search?: string): Promise<any> {
    
    const qb = this.userTypeRepo.createQueryBuilder('userType');

    // search filter
    if (search) {
      qb.andWhere(
        `(userType.name LIKE :search 
        OR userType.description LIKE :search)`, // adjust if your table has other fields
        { search: `%${search}%` },
      );
    }

    // order + pagination
    qb.orderBy('userType.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    // get data + total
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      message: 'User Types',
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<any> {
    const userType = await this.userTypeRepo.findOne({ where: { id } });
    if (!userType) throw new NotFoundException('UserType not found');
    return { data: userType, message: 'User type' };
  }

  async update(
    role: string,
    user_id: number,
    id: number,
    dto: UpdateUserTypeDto,
  ): Promise<any> {
    if (role !== 'admin') {
      throw new NotFoundException('Only admins can create products');
    }
    const userType = await this.findOne(id);
    Object.assign(userType, dto);
    await this.userTypeRepo.save(userType);
    return { message: 'User type updated' };
  }

  async remove(role: string, user_id: number, id: number): Promise<any> {
    if (role !== 'admin') {
      throw new NotFoundException('Only admins can create products');
    }
    const userType = await this.findOne(id);
    await this.userTypeRepo.remove(userType);
    return { message: 'User type removed' };
  }
}
