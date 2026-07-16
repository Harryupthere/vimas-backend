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
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService
  ) {}

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
    return {
      data: {
        access_token: this.jwtService.sign(payload, {
          secret: process.env.JWT_SECRET || "your_secret_key",
          expiresIn: "1h",
        }),
        user: admin.username,
      },
      message: "Login successful",
    };
  }
}
