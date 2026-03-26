import { Test, TestingModule } from '@nestjs/testing';
import { DapurService } from './dapur.service';

describe('DapurService', () => {
  let service: DapurService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DapurService],
    }).compile();

    service = module.get<DapurService>(DapurService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
