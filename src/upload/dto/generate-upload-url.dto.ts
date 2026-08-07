import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsNotEmpty()
  @IsString()
  filename: string;

  @IsNotEmpty()
  @IsString()
  fileType: string;
}
