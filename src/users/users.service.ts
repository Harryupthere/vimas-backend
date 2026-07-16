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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserType } from 'src/shared/entities/user_types.entity';
import { RegistrationType } from 'src/shared/entities/registration_types.entity';
import { UserSessionStorage } from '../shared/entities/user_session_storage.entity';
import { UserSession } from '../shared/entities/user_session.entity';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserType)
    private readonly userTypeRepo: Repository<UserType>,

    @InjectRepository(RegistrationType)
    private readonly registrationTypeRepo: Repository<RegistrationType>,
    @InjectRepository(UserSession)
    private readonly userSessionRepo: Repository<UserSession>,
    @InjectRepository(UserSessionStorage)
    private readonly userSessionStorageRepo: Repository<UserSessionStorage>,
    private readonly emailService: EmailService,

    private readonly jwtService: JwtService,
  ) {}

  // signs an access token from the given payload, plus a long-lived refresh
  // token, and persists the refresh token so it can be revoked/rotated later
  private async issueTokens(
    userId: number,
    accessPayload: Record<string, any>,
  ) {
    const access_token = this.jwtService.sign(accessPayload, {
      secret: process.env.JWT_SECRET || 'your_secret_key',
      expiresIn: '1h',
    });

    const refresh_token = this.jwtService.sign(
      { sub_id: userId, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      },
    );

    await this.userRepo.update(userId, { refresh_token });

    return { access_token, refresh_token };
  }

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
      unique_user_id: `VIMAS#${uuidv4()}`, // Generate unique_id
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

    if (registrationType && registrationType.id === 4 && dto.email) {
      throw new UnauthorizedException(
        'Email is not required for Telegram registration',
      );
    }

    if (
      registrationType &&
      registrationType.id === 4 &&
      (!dto.telegram_id || dto.telegram_id === '')
    ) {
      throw new UnauthorizedException(
        'telegram id required for Telegram registration',
      );
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
      await this.emailService.sendEmail(
        savedUser.email,
        'Verify your email address',
        'verification',
        {
          name: savedUser.first_name || 'User',
          verifyUrl,
        },
      );

      console.log('Send email verification link:', verifyUrl);
      message = 'Verification email sent.';
      data = {};
    } else {
      const user = await this.userRepo.findOne({
        where: { id: savedUser.id },
        select: [
          'id',
          'email',
          'unique_user_id',
          'telegram_id',
          'password',
          'first_name',
          'last_name',
          'profile',
          'registrationType',
          'email_verified',
          'status',
          'is_admin_deleted',
          'is_self_deleted',
        ],
        relations: ['registrationType', 'userType'],
      });

      if (!user) {
        throw new NotFoundException('User not found after creation');
      }

      // Now TypeScript knows user exists and has these properties
      const {
        password,
        is_admin_deleted,
        is_self_deleted,
        registrationType,
        ...result
      } = user as User; // Type assertion to User

      const { access_token, refresh_token } = await this.issueTokens(
        savedUser.id,
        {
          sub_id: savedUser.id,
          email: savedUser.email,
          type: 'login',
          role: 'user',
        },
      );

      // Delete existing active sessions for this user
      await this.userSessionRepo.delete({ user_id: savedUser.id });

      const session = {
        user: { id: savedUser.id } as any,
        jwt_token: access_token,
        device_id: dto.device_id || null,
        ip_address: dto.ip || null,
        user_agent: dto.user_agent || null,
      } as unknown as UserSession;

      await this.userSessionRepo.save(session);

      const sessionStorage = {
        user: { id: savedUser.id } as any,
        device_id: dto.device_id || null,
        ip_address: dto.ip || null,
        user_agent: dto.user_agent || null,
      } as unknown as UserSessionStorage;

      await this.userSessionStorageRepo.save(sessionStorage);
      //   await this.userSessionRepo.save(session);

      console.log('Direct login token:', access_token);
      message = 'Congratulations to be a part of Vimas.';
      data = {
        user: result,
        access_token,
        refresh_token,
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
      registrationType,
      ...result
    } = user;
    const payload = {
      user_id: user.email ? user.email : user.telegram_id,
      sub_id: user.id,
      type: 'login',
      role: 'user',
    };

    // return {
    //   data: {
    //     access_token: this.jwtService.sign(payload, {
    //       secret: process.env.JWT_SECRET || "your_secret_key",
    //       expiresIn: "1h",
    //     }),
    //     user: result,
    //   },
    //   message: "Login successful",
    // };

    const { access_token, refresh_token } = await this.issueTokens(
      user.id,
      payload,
    );

    // Remove any old session for this user (single-device rule)
    await this.userSessionRepo.delete({ user_id: user.id });

    const session = {
      user: { id: user.id } as any,
      jwt_token: access_token,
      device_id: dto.device_id || null,
      ip_address: dto.ip || null,
      user_agent: dto.user_agent || null,
    } as unknown as UserSession;

    await this.userSessionRepo.save(session);

    const sessionStorage = {
      user: { id: user.id } as any,
      device_id: dto.device_id || null,
      ip_address: dto.ip || null,
      user_agent: dto.user_agent || null,
    } as unknown as UserSessionStorage;

    await this.userSessionStorageRepo.save(sessionStorage);

    return {
      data: {
        access_token,
        refresh_token,
        user: result,
      },
      message: 'Login successful',
    };
  }

  // Exchange a valid, non-revoked refresh token for a new access token
  // (rotates the refresh token too, so a stolen-but-unused token stops working
  // the next time the legitimate client refreshes).
  async refreshToken(dto: RefreshTokenDto): Promise<any> {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh' || !decoded.sub_id) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: decoded.sub_id },
      select: [
        'id',
        'email',
        'telegram_id',
        'refresh_token',
        'status',
        'is_admin_deleted',
        'is_self_deleted',
      ],
    });

    if (
      !user ||
      !user.refresh_token ||
      user.refresh_token !== dto.refreshToken
    ) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (user.status === 0) {
      throw new UnauthorizedException('User is inactive');
    }
    if (user.is_admin_deleted === 1 || user.is_self_deleted === 1) {
      throw new UnauthorizedException(
        'User is deleted. Please contact support.',
      );
    }

    const payload = {
      user_id: user.email ? user.email : user.telegram_id,
      sub_id: user.id,
      type: 'login',
      role: 'user',
    };

    const tokens = await this.issueTokens(user.id, payload);

    return {
      data: tokens,
      message: 'Token refreshed successfully',
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

  async getProfile(role: string, id: number) {
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

  async updateProfile(role: string, id: number, dto: UpdateProfileDto) {
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

  async findAll(
    page: number,
    limit: number,
    search?: string,
    userTypeId?: number, // <-- added
  ): Promise<any> {
    const query = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userType', 'userType')
      .leftJoinAndSelect('user.registrationType', 'registrationType')
      // explicitly select fields to avoid returning password
      .select([
        'user.id',
        'user.unique_user_id',
        'user.first_name',
        'user.last_name',
        'user.email',
        'user.telegram_id',
        'user.phone_number',
        'user.country',
        'user.country_code',
        'user.profile',
        'user.email_verified',
        'user.phone_number_verified',
        'user.status',
        'user.is_admin_deleted',
        'user.is_self_deleted',
        'user.admin_deleted_reason',
        'user.self_deleted_reason',
        'user.created_at',
        'user.updated_at',
        'userType.id',
        'userType.name',
        'userType.description',
        'registrationType.id',
        'registrationType.name',
        'registrationType.description',
      ])
      .orderBy('user.id', 'ASC');

    // apply filters
    if (search) {
      const s = `%${search}%`;
      query.andWhere(
        '(user.first_name LIKE :s OR user.last_name LIKE :s OR user.email LIKE :s OR user.telegram_id LIKE :s OR user.phone_number LIKE :s OR user.country LIKE :s)',
        { s },
      );
    }

    if (userTypeId) {
      // filter by userType.id (FK)
      query.andWhere('userType.id = :userTypeId', { userTypeId });
    }

    // pagination
    query.skip((page - 1) * limit).take(limit);

    const [users, total] = await query.getManyAndCount();

    return {
      data: {
        users,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
      message: 'Users fetched successfully',
    };
  }

  async findOne(id: number): Promise<any> {
    // include FK relations and ensure password is not returned
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['userType', 'registrationType'],
    });
    if (!user) throw new NotFoundException('User not found');

    // remove password if it somehow got selected
    const u = user as any;
    if (u.password) delete u.password;

    return { data: u, message: 'User' };
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, dto); // only the allowed fields from dto will update

    return { message: 'User updated' };
  }

  async updatePassword(userId: number, body: any): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      user.password = await bcrypt.hash(body.newPassword, 10);
    } else {
      const isPasswordValid = await bcrypt.compare(
        body.oldPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid current password');
      }
      user.password = await bcrypt.hash(body.newPassword, 10);
    }
    await this.userRepo.save(user);
    return { message: 'Password updated successfully' };
  }

  // Request a password-reset link (console-only; only registration_type_id === 1 allowed)
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['registrationType'],
    });

    if (!user) {
      // Do not reveal existence — but keep behavior simple per request
      throw new NotFoundException('User not found');
    }

    // Only users registered via form (type 1) can request reset
    if (!user.registrationType || user.registrationType.id !== 1) {
      throw new BadRequestException(
        'Password reset is only available for users registered via form',
      );
    }

    const token = this.jwtService.sign(
      {
        sub_id: user.id,
        email: user.email,
        type: 'password_reset',
      },
      {
        secret: process.env.JWT_SECRET || 'your_secret_key',
        expiresIn: '1h',
      },
    );

    const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;

    // Dummy email: console the link since no mailer is configured
    console.log('Password reset link (console-only):', resetUrl);

    return { message: 'Password reset link generated' };
  }

  // Reset password using token
  async resetPassword(dto: ResetPasswordDto): Promise<any> {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(dto.token, {
        secret: process.env.JWT_SECRET || 'your_secret_key',
      });
    } catch (err) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (decoded.type !== 'password_reset' || !decoded.sub_id) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.userRepo.findOne({
      where: { id: decoded.sub_id },
      relations: ['registrationType'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.registrationType || user.registrationType.id !== 1) {
      throw new BadRequestException(
        'Password reset is only available for users registered via form',
      );
    }

    // Hash and save new password
    user.password = await bcrypt.hash(dto.newPassword, 10);
    // ensure user becomes active if desired (optional)
    user.status = 1;
    await this.userRepo.save(user);

    return { message: 'Password has been reset successfully' };
  }
}
