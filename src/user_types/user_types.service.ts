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

  async create(dto: CreateUserTypeDto): Promise<UserType> {
    const userType = this.userTypeRepo.create(dto);
    return this.userTypeRepo.save(userType);
  }

  async findAll(): Promise<UserType[]> {
    return this.userTypeRepo.find();
  }

  async findOne(id: number): Promise<UserType> {
    const userType = await this.userTypeRepo.findOne({ where: { id } });
    if (!userType) throw new NotFoundException('UserType not found');
    return userType;
  }

  async update(id: number, dto: UpdateUserTypeDto): Promise<UserType> {
    const userType = await this.findOne(id);
    Object.assign(userType, dto);
    return this.userTypeRepo.save(userType);
  }

  async remove(id: number): Promise<void> {
    const userType = await this.findOne(id);
    await this.userTypeRepo.remove(userType);
  }
}
