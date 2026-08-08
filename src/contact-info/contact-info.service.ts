import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInfo } from '../shared/entities/contact-info.entity';
import { CreateContactInfoDto } from './dto/create-contact-info.dto';
import { UpdateContactInfoDto } from './dto/update-contact-info.dto';

@Injectable()
export class ContactInfoService {
  constructor(
    @InjectRepository(ContactInfo)
    private readonly contactInfoRepo: Repository<ContactInfo>,
  ) {}

  async create(userId: number, dto: CreateContactInfoDto) {
    try {
      const contactInfo = this.contactInfoRepo.create({ ...dto, userId });
      const saved = await this.contactInfoRepo.save(contactInfo);
      return { data: saved, message: 'Contact info created successfully' };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('This phone number is already registered');
      }
      throw err;
    }
  }

  async findAllMine(userId: number, search?: string) {
    const query = this.contactInfoRepo
      .createQueryBuilder('contactInfo')
      .where('contactInfo.user_id = :userId', { userId })
      .orderBy('contactInfo.id', 'DESC');

    if (search) {
      query.andWhere(
        `(contactInfo.address_1 LIKE :search
          OR contactInfo.address_2 LIKE :search
          OR contactInfo.landmark LIKE :search
          OR contactInfo.state LIKE :search
          OR contactInfo.country LIKE :search
          OR contactInfo.phone_number LIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const data = await query.getMany();
    return { data, message: 'Contact info fetched successfully' };
  }

  async findOneMine(userId: number, id: number) {
    const contactInfo = await this.contactInfoRepo.findOne({
      where: { id, userId },
    });
    if (!contactInfo) throw new NotFoundException('Contact info not found');
    return { data: contactInfo, message: 'Contact info' };
  }

  async update(userId: number, id: number, dto: UpdateContactInfoDto) {
    const contactInfo = await this.contactInfoRepo.findOne({
      where: { id, userId },
    });
    if (!contactInfo) throw new NotFoundException('Contact info not found');

    Object.assign(contactInfo, dto);

    try {
      const saved = await this.contactInfoRepo.save(contactInfo);
      return { data: saved, message: 'Contact info updated successfully' };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('This phone number is already registered');
      }
      throw err;
    }
  }

  async remove(userId: number, id: number) {
    const contactInfo = await this.contactInfoRepo.findOne({
      where: { id, userId },
    });
    if (!contactInfo) throw new NotFoundException('Contact info not found');

    try {
      await this.contactInfoRepo.remove(contactInfo);
      return { message: 'Contact info removed successfully' };
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Cannot delete an address used by an existing order',
        );
      }
      throw err;
    }
  }
}
