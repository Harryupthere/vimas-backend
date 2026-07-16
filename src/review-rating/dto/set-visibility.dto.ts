import { IsIn, IsNotEmpty } from 'class-validator';

export class SetVisibilityDto {
  @IsIn([0, 1])
  @IsNotEmpty()
  showStatus: number;
}
