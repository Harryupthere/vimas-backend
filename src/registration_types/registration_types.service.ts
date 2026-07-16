import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationType } from '../shared/entities/registration_types.entity';
import { CreateRegistrationTypeDto } from './dto/create-registration-type.dto';
import { UpdateRegistrationTypeDto } from './dto/update-registration-type.dto';

@Injectable()
export class RegistrationTypesService {
  constructor(
    @InjectRepository(RegistrationType)
    private readonly registrationTypeRepo: Repository<RegistrationType>,
  ) {}

  async create(dto: CreateRegistrationTypeDto): Promise<RegistrationType> {
    const regType = this.registrationTypeRepo.create(dto);
    return this.registrationTypeRepo.save(regType);
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
    status?: number,
  ): Promise<any> {
    const qb = this.registrationTypeRepo.createQueryBuilder('registrationType');

    // 🔍 Search filter
    if (search) {
      qb.andWhere(
        `(registrationType.name LIKE :search 
        OR registrationType.description LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    // 🟢 Status filter
    if (status !== undefined && status !== null) {
      qb.andWhere(`registrationType.status = :status`, { status });
    }

    // Order + pagination
    qb.orderBy('registrationType.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      message: 'Registration Types',
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<RegistrationType> {
    const regType = await this.registrationTypeRepo.findOne({ where: { id } });
    if (!regType) throw new NotFoundException('RegistrationType not found');
    return regType;
  }

  async update(id: number, dto: UpdateRegistrationTypeDto): Promise<any> {
    const regType = await this.findOne(id);

    Object.assign(regType, dto);

    await this.registrationTypeRepo.save(regType);

    return { message: 'Registration type updated' };
  }

  async remove(id: number): Promise<any> {
    const regType = await this.findOne(id);
    await this.registrationTypeRepo.remove(regType);

    return { message: 'Registration type removed' };
  }
}
