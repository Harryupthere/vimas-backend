import { PartialType } from '@nestjs/mapped-types';
import { CreateRegistrationTypeDto } from './create-registration-type.dto';

export class UpdateRegistrationTypeDto extends PartialType(CreateRegistrationTypeDto) {}
