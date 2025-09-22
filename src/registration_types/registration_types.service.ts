import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(): Promise<RegistrationType[]> {
    return this.registrationTypeRepo.find();
  }

  async findOne(id: number): Promise<RegistrationType> {
    const regType = await this.registrationTypeRepo.findOne({ where: { id } });
    if (!regType) throw new NotFoundException('RegistrationType not found');
    return regType;
  }

  async update(
    id: number,
    dto: UpdateRegistrationTypeDto,
  ): Promise<RegistrationType> {
    const regType = await this.findOne(id);
    Object.assign(regType, dto);
    return this.registrationTypeRepo.save(regType);
  }

  async remove(id: number): Promise<void> {
    const regType = await this.findOne(id);
    await this.registrationTypeRepo.remove(regType);
  }
}
