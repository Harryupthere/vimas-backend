import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { User } from '../shared/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserType } from 'src/shared/entities/user_types.entity';
import { RegistrationType } from 'src/shared/entities/registration_types.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserType)
    private readonly userTypeRepo: Repository<UserType>,

    @InjectRepository(RegistrationType)
    private readonly registrationTypeRepo: Repository<RegistrationType>,

    private readonly jwtService: JwtService,
  ) {}

  async create(dto: CreateUserDto): Promise<{ data: any; message: string }> {
    const condition =
      dto.registration_type_id === 1 || dto.registration_type_id === 2
        ? { email: dto.email }
        : { telegram_id: dto.telegram_id };

    const existing = await this.userRepo.findOne({ where: condition });
    if (existing) {
      const msg =
        dto.registration_type_id === 1 || dto.registration_type_id === 2
          ? 'Email already in use'
          : 'Telegram ID already in use';
      throw new BadRequestException(msg);
    }
    const userType = await this.userTypeRepo.findOne({
      where: { id: dto.user_type_id },
    });
    const registrationType = await this.registrationTypeRepo.findOne({
      where: { id: dto.registration_type_id },
    });
    let referralUser: User | null = null;

    if (dto.referral_id) {
      referralUser =
        (await this.userRepo.findOne({
          where: { id: dto.referral_id },
        })) || null;
    }

    const hashedPassword =
      dto.registration_type_id === 1 ? await bcrypt.hash(dto.password, 10) : '';

    const userData: DeepPartial<User> = {
      ...dto,
      password: hashedPassword,
      status: dto.registration_type_id !== 1 ? 1 : 0,
      email_verified: dto.registration_type_id === 2 ? 1 : 0,
    };

    // Only assign if the object is not null
    if (userType) {
      userData.userType = userType;
    }
    if (registrationType) {
      userData.registrationType = registrationType;
    }
    if (referralUser) {
      userData.referral = referralUser;
    }

    const user = this.userRepo.create(userData);
    const savedUser = await this.userRepo.save(user);

    let message;
    let data;

    if (dto.registration_type_id === 1) {
      const token = await this.jwtService.sign(
        {
          sub_id: savedUser.id,
          user_id: savedUser.email,
          type: 'email_verification',
        },
        {
          secret: process.env.JWT_SECRET || 'your_secret_key',
          expiresIn: '7d',
        },
      );

      // build URL for frontend
      const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

      // TODO: send email using your mailer service
      console.log('Send email verification link:', verifyUrl);
      message = 'Verification email sent.';
      data = {};
    } else {
      // Google / Telegram — directly generate login token
      const access_token = this.jwtService.sign(
        { sub_id: savedUser.id, email: savedUser.email, type: 'login' },
        {
          secret: process.env.JWT_SECRET || 'your_secret_key',
          expiresIn: '1hr',
        },
      );

      console.log('Direct login token:', access_token);
      message = 'Congratulations to be a part of Vimas.';
      data = {
        user: {
          id: savedUser.id,
          email: savedUser.email,
          telegram_id: savedUser.telegram_id,
          first_name: savedUser.first_name,
          last_name: savedUser.last_name,
          status: savedUser.status,
          email_verified: savedUser.email_verified,
        },
        access_token,
      };
    }
    return {
      message,
      data,
    };
  }

  async login(dto: LoginUserDto): Promise<any> {
    const condition =
      dto.login_type === 1 || dto.login_type === 2
        ? { email: dto.email }
        : { telegram_id: dto.telegram_id };

    const user = await this.userRepo.findOne({
      where: condition,
      select: [
        'id',
        'email',
        'telegram_id',
        'password',
        'first_name',
        'last_name',
        'userType',
        'profile',
        'registrationType',
        'email_verified',
        'status',
        'is_admin_deleted',
        'is_self_deleted',
      ],
      relations: ['registrationType', 'userType'], // load registrationType relation
    });

    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }
    // 3. Status checks (shared for all login types)
    if (user.status === 0) {
      throw new UnauthorizedException('User is inactive');
    }
    if (user.is_admin_deleted === 1 || user.is_self_deleted === 1) {
      throw new UnauthorizedException(
        'User is deleted. Please contact support.',
      );
    }

    // 4. Login type specific rules
    if (dto.login_type === 1) {
      if (user.email_verified === 0) {
        throw new UnauthorizedException('Email not verified');
      }

      if (user.registrationType.id === 2 || user.password === null)
        throw new UnauthorizedException(
          'Please login via google and then create password in your profile.',
        );

      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    if (dto.login_type === 4 && !user.telegram_id) {
      throw new UnauthorizedException('Telegram ID not linked');
    }

    if (
      (dto.login_type === 1 || dto.login_type === 2) &&
      user.registrationType.id === 4
    ) {
      throw new UnauthorizedException(
        'Please login via telegram and verify your email to login with google or email.',
      );
    }

    // Remove password before returning
    const {
      password,
      is_admin_deleted,
      is_self_deleted,
      userType,
      registrationType,
      ...result
    } = user;
    const payload = {
      user_id: user.email ? user.email : user.telegram_id,
      sub_id: user.id,
      type: 'login',
    };

    return {
      data: {
        access_token: this.jwtService.sign(payload, {
          secret: process.env.JWT_SECRET || 'your_secret_key',
          expiresIn: '1h',
        }),
        user: result,
      },
      message: 'Login successful',
    };
  }

  async verifyEmail(token: string): Promise<any> {
    const decoded = this.jwtService.verify(token);

    if (decoded.type !== 'email_verification') {
      throw new UnauthorizedException('Invalid verification type');
    }

    const user = await this.userRepo.findOne({ where: { id: decoded.sub_id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.email_verified === 1 && user.status === 1) {
      throw new UnauthorizedException('User already verified');
    }
    user.status = 1;
    user.email_verified = 1;
    await this.userRepo.save(user);
    return { data: {}, message: 'Email verification successful' };
  }

  async getProfile(id: number) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userType', 'userType')
      .leftJoinAndSelect('user.registrationType', 'registrationType')
      .where('user.id = :id', { id })
      .select([
        'user.id',
        'user.email',
        'user.telegram_id',
        'user.first_name',
        'user.last_name',
        'user.phone_number',
        'user.status',
        'user.email_verified',
        'user.phone_number_verified',
        'user.profile',
        'user.created_at',
        'user.updated_at',
        'userType.name',
        'userType.description',
        'registrationType.name',
        'registrationType.description',
      ])
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const user = await this.findOne(id);

    if (
      ((user.registrationType.id === 1 || user.registrationType.id === 2) &&
        dto.email) ||
      (user.registrationType.id === 4 && dto.telegram_id)
    ) {
      throw new UnauthorizedException(
        'Can not change registration type entity',
      );
    }

    let message = 'Profile updated';
    if (
      user.email_verified === 0 &&
      user.registrationType.id === 4 &&
      dto.email
    ) {
      // send email verififcation
      const token = await this.jwtService.sign(
        {
          sub_id: user.id,
          user_id: dto.email,
          type: 'email_verification',
        },
        {
          secret: process.env.JWT_SECRET || 'your_secret_key',
          expiresIn: '7d',
        },
      );

      // build URL for frontend
      const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

      // TODO: send email using your mailer service
      console.log('Send email verification link:', verifyUrl);
      message = 'Profile updated and verification email sent.';
    }

    Object.assign(user, dto); // only updates provided fields
    return { message, data: {} };
  }

  async findAll(page: number, limit: number): Promise<any> {
    const [users, total] = await this.userRepo.findAndCount({
      skip: (page - 1) * limit, // how many to skip
      take: limit, // how many to take
      order: { id: 'ASC' }, // optional: order by id
    });

    return {
      data: {
        users,
        total, // total number of users in DB
        page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit),
      },

      message: 'Users',
    };
  }

  async findOne(id: number): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return { data: user, message: 'User' };
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, dto); // only the allowed fields from dto will update

    return { message: 'User updated' };
  }
}
