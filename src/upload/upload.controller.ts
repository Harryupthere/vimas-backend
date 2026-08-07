import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/shared/auth/strategies/auth.guard';
import { UploadService } from './upload.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  generatePresignedUrl(@Body() dto: GenerateUploadUrlDto) {
    return this.uploadService.generatePresignedUrl(dto.filename, dto.fileType);
  }
}
