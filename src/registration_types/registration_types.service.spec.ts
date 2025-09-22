import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationTypesService } from './admin/registration_types.service';

describe('RegistrationTypesService', () => {
  let service: RegistrationTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RegistrationTypesService],
    }).compile();

    service = module.get<RegistrationTypesService>(RegistrationTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
