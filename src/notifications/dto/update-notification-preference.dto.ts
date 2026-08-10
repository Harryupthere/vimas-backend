import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateNotificationPreferenceDto {
  @IsBoolean()
  @IsNotEmpty()
  isEnabled: boolean;
}
