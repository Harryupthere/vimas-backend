import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationTypesController } from './registration_types.controller';

describe('RegistrationTypesController', () => {
  let controller: RegistrationTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationTypesController],
    }).compile();

    controller = module.get<RegistrationTypesController>(RegistrationTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
