import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipType } from '../shared/entities/membership-type.entity';
import { CreateMembershipTypeDto } from './dto/create-membership-type.dto';
import { UpdateMembershipTypeDto } from './dto/update-membership-type.dto';

@Injectable()
export class MembershipTypesService {
  constructor(
    @InjectRepository(MembershipType)
    private readonly membershipTypeRepo: Repository<MembershipType>,
  ) {}

  async create(
    role: string,
    user_id: number,
    dto: CreateMembershipTypeDto,
  ): Promise<any> {
    if (role !== 'admin') {
      throw new NotFoundException('Only admins can create membership types');
    }
    const membershipType = this.membershipTypeRepo.create(dto);
    await this.membershipTypeRepo.save(membershipType);
    return { message: 'Membership type created' };
  }

  async findAll(page: number, limit: number, search?: string): Promise<any> {
    const qb = this.membershipTypeRepo.createQueryBuilder('membershipType');

    // search filter
    if (search) {
      qb.andWhere(
        `(membershipType.name LIKE :search
        OR membershipType.description LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    // order + pagination
    qb.orderBy('membershipType.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    // get data + total
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      message: 'Membership Types',
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<any> {
    const membershipType = await this.membershipTypeRepo.findOne({
      where: { id },
    });
    if (!membershipType)
      throw new NotFoundException('Membership type not found');
    return { data: membershipType, message: 'Membership type' };
  }

  async update(
    role: string,
    user_id: number,
    id: number,
    dto: UpdateMembershipTypeDto,
  ): Promise<any> {
    if (role !== 'admin') {
      throw new NotFoundException('Only admins can update membership types');
    }
    const membershipType = await this.membershipTypeRepo.findOne({
      where: { id },
    });
    if (!membershipType)
      throw new NotFoundException('Membership type not found');
    Object.assign(membershipType, dto);
    await this.membershipTypeRepo.save(membershipType);
    return { message: 'Membership type updated' };
  }

  async remove(role: string, user_id: number, id: number): Promise<any> {
    if (role !== 'admin') {
      throw new NotFoundException('Only admins can delete membership types');
    }
    const membershipType = await this.membershipTypeRepo.findOne({
      where: { id },
    });
    if (!membershipType)
      throw new NotFoundException('Membership type not found');
    await this.membershipTypeRepo.remove(membershipType);
    return { message: 'Membership type removed' };
  }
}
