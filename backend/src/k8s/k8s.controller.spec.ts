import { Test, TestingModule } from '@nestjs/testing';
import { K8sController } from './k8s.controller';

describe('K8sController', () => {
  let controller: K8sController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [K8sController],
    }).compile();

    controller = module.get<K8sController>(K8sController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
