import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../shared/entities/admin.entity';
import { LoginAdminDto } from './login.dto';
import { JwtService } from '@nestjs/jwt';
import { ChangePasswordAdminDto } from './changePassword.dto';
import { RefreshTokenAdminDto } from './refresh-token.dto';
import { Role } from '../shared/entities/role.entity';
import { AdminRole } from '../shared/entities/admin-role.entity';
import { CreateAdminDto } from './create-admin.dto';
import { UpdateAdminDto } from './update-admin.dto';
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(AdminRole)
    private readonly adminRoleRepo: Repository<AdminRole>,

    private readonly jwtService: JwtService,
  ) {}

  // signs an access token from the given payload, plus a long-lived refresh
  // token, and persists the refresh token so it can be revoked/rotated later
  private async issueTokens(
    adminId: number,
    accessPayload: Record<string, any>,
  ) {
    const access_token = this.jwtService.sign(accessPayload, {
      secret: process.env.JWT_SECRET || 'your_secret_key',
      expiresIn: '1h',
    });

    const refresh_token = this.jwtService.sign(
      { sub_id: adminId, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      },
    );

    await this.adminRepo.update(adminId, { refresh_token });

    return { access_token, refresh_token };
  }

  async changePassword(
    role: string,
    changePasswordDto: ChangePasswordAdminDto,
  ): Promise<any> {
    if (role !== 'admin') {
      throw new UnauthorizedException('Only admins can change password');
    }
    const admin = await this.adminRepo.findOne({ where: { id: 1 } });
    if (!admin) throw new NotFoundException('Admin not found');

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      admin.password,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    admin.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.adminRepo.save(admin);
    return { message: 'Password changed successfully' };
  }

  async findByUsername(username: string): Promise<any> {
    console.log('Finding admin by username:', username);
    return this.adminRepo.findOne({ where: { username } });
  }

  async validateLogin(loginDto: LoginAdminDto): Promise<any> {
    const admin = await this.findByUsername(loginDto.username);
    if (!admin) throw new NotFoundException('Admin not found');

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      admin.password,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');
    const payload = {
      username: admin.username,
      sub_id: admin.id,
      role: 'admin',
    };

    const { access_token, refresh_token } = await this.issueTokens(
      admin.id,
      payload,
    );

    return {
      data: {
        access_token,
        refresh_token,
        user: admin.username,
      },
      message: 'Login successful',
    };
  }

  // Exchange a valid, non-revoked refresh token for a new access token
  // (rotates the refresh token too, so a stolen-but-unused token stops
  // working the next time the legitimate admin refreshes).
  async refreshToken(dto: RefreshTokenAdminDto): Promise<any> {
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

    const admin = await this.adminRepo.findOne({
      where: { id: decoded.sub_id },
    });

    if (
      !admin ||
      !admin.refresh_token ||
      admin.refresh_token !== dto.refreshToken
    ) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const payload = {
      username: admin.username,
      sub_id: admin.id,
      role: 'admin',
    };

    const tokens = await this.issueTokens(admin.id, payload);

    return {
      data: tokens,
      message: 'Token refreshed successfully',
    };
  }

  async createAdmin(currentAdminId: number, dto: CreateAdminDto): Promise<any> {
    // 1. Check if username/email already exists
    const existingAdmin = await this.adminRepo.findOne({
      where: { username: dto.username },
    });

    if (existingAdmin) {
      throw new UnauthorizedException(
        'Admin with this username already exists',
      );
    }

    // 2. Verify requested role exists and is active
    const role = await this.roleRepo.findOne({
      where: {
        id: dto.adminRoleId,
        is_active: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Admin role not found or inactive');
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 4. Create admin
    const admin = this.adminRepo.create({
      username: dto.username,
      password: hashedPassword,
      refresh_token: null,
    });

    const savedAdmin = await this.adminRepo.save(admin);

    // 5. Assign role
    const adminRole = this.adminRoleRepo.create({
      admin_id: savedAdmin.id,
      role_id: role.id,
    });

    await this.adminRoleRepo.save(adminRole);

    return {
      data: {
        id: savedAdmin.id,
        username: savedAdmin.username,
        role: {
          id: role.id,
          name: role.name,
          slug: role.slug,
        },
      },
      message: 'Admin created successfully',
    };
  }

  private async attachRole(admin: Admin) {
    const adminRole = await this.adminRoleRepo.findOne({
      where: { admin_id: admin.id },
      relations: { role: true },
    });

    return {
      id: admin.id,
      username: admin.username,
      role: adminRole?.role
        ? {
            id: adminRole.role.id,
            name: adminRole.role.name,
            slug: adminRole.role.slug,
          }
        : null,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
    };
  }

  async findAll(page = 1, limit = 10, search?: string): Promise<any> {
    const query = this.adminRepo.createQueryBuilder('admin');

    if (search) {
      query.andWhere('admin.username ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [admins, total] = await query
      .orderBy('admin.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = await Promise.all(
      admins.map((admin) => this.attachRole(admin)),
    );

    return {
      data,
      meta: { total, page, limit },
      message: 'Admins fetched successfully',
    };
  }

  async findOne(id: number): Promise<any> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    return {
      data: await this.attachRole(admin),
      message: 'Admin fetched successfully',
    };
  }

  async updateAdmin(id: number, dto: UpdateAdminDto): Promise<any> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    if (dto.username && dto.username !== admin.username) {
      const existingAdmin = await this.adminRepo.findOne({
        where: { username: dto.username },
      });
      if (existingAdmin) {
        throw new UnauthorizedException(
          'Admin with this username already exists',
        );
      }
      admin.username = dto.username;
    }

    await this.adminRepo.save(admin);

    if (dto.adminRoleId) {
      const role = await this.roleRepo.findOne({
        where: { id: dto.adminRoleId, is_active: true },
      });
      if (!role) {
        throw new NotFoundException('Admin role not found or inactive');
      }

      const existingAdminRole = await this.adminRoleRepo.findOne({
        where: { admin_id: admin.id },
      });

      if (existingAdminRole) {
        existingAdminRole.role_id = role.id;
        await this.adminRoleRepo.save(existingAdminRole);
      } else {
        await this.adminRoleRepo.save(
          this.adminRoleRepo.create({
            admin_id: admin.id,
            role_id: role.id,
          }),
        );
      }
    }

    return {
      data: await this.attachRole(admin),
      message: 'Admin updated successfully',
    };
  }
}
