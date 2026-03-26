import { Test, TestingModule } from '@nestjs/testing';
import { DapurController } from './dapur.controller';

describe('DapurController', () => {
  let controller: DapurController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DapurController],
    }).compile();

    controller = module.get<DapurController>(DapurController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
