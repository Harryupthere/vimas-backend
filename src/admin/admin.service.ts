import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { Admin } from "../shared/entities/admin.entity";
import { LoginAdminDto } from "./login.dto";
import { JwtService } from "@nestjs/jwt";
import { ChangePasswordAdminDto } from "./changePassword.dto";
import { RefreshTokenAdminDto } from "./refresh-token.dto";
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService
  ) {}

  // signs an access token from the given payload, plus a long-lived refresh
  // token, and persists the refresh token so it can be revoked/rotated later
  private async issueTokens(
    adminId: number,
    accessPayload: Record<string, any>
  ) {
    const access_token = this.jwtService.sign(accessPayload, {
      secret: process.env.JWT_SECRET || "your_secret_key",
      expiresIn: "1h",
    });

    const refresh_token = this.jwtService.sign(
      { sub_id: adminId, type: "refresh" },
      {
        secret: process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret",
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
      }
    );

    await this.adminRepo.update(adminId, { refresh_token });

    return { access_token, refresh_token };
  }

  async changePassword(
    role: string,
    changePasswordDto: ChangePasswordAdminDto
  ): Promise<any> {
    if (role !== "admin") {
      throw new UnauthorizedException("Only admins can change password");
    }
    const admin = await this.adminRepo.findOne({ where: { id: 1 } });
    if (!admin) throw new NotFoundException("Admin not found");

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      admin.password
    );
    if (!isPasswordValid)
      throw new UnauthorizedException("Invalid credentials");

    admin.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.adminRepo.save(admin);
    return { message: "Password changed successfully" };
  }

  async findByUsername(username: string): Promise<any> {
    console.log("Finding admin by username:", username);
    return this.adminRepo.findOne({ where: { username } });
  }

  async validateLogin(loginDto: LoginAdminDto): Promise<any> {
    const admin = await this.findByUsername(loginDto.username);
    if (!admin) throw new NotFoundException("Admin not found");

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      admin.password
    );
    if (!isPasswordValid)
      throw new UnauthorizedException("Invalid credentials");
    const payload = { username: admin.username, sub_id: admin.id, role: "admin" };

    const { access_token, refresh_token } = await this.issueTokens(
      admin.id,
      payload
    );

    return {
      data: {
        access_token,
        refresh_token,
        user: admin.username,
      },
      message: "Login successful",
    };
  }

  // Exchange a valid, non-revoked refresh token for a new access token
  // (rotates the refresh token too, so a stolen-but-unused token stops
  // working the next time the legitimate admin refreshes).
  async refreshToken(dto: RefreshTokenAdminDto): Promise<any> {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret",
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (decoded.type !== "refresh" || !decoded.sub_id) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const admin = await this.adminRepo.findOne({
      where: { id: decoded.sub_id },
    });

    if (
      !admin ||
      !admin.refresh_token ||
      admin.refresh_token !== dto.refreshToken
    ) {
      throw new UnauthorizedException("Refresh token has been revoked");
    }

    const payload = {
      username: admin.username,
      sub_id: admin.id,
      role: "admin",
    };

    const tokens = await this.issueTokens(admin.id, payload);

    return {
      data: tokens,
      message: "Token refreshed successfully",
    };
  }
}
