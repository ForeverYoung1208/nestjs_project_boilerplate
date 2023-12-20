import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

export const appBuilder = async (): Promise<TestingModuleBuilder> => {
  // Sample of the possible pre-initialization
  // initializeTransactionalContext();
  // patchTypeORMRepositoryWithBaseRepository();

  return Test.createTestingModule({
    imports: [AppModule],
  });
  // Sample of the possible provider overriding:
  // .overrideProvider(MailerService)
  // .useValue(mockMailerService)
  // .overrideProvider(AwsService)
  // .useValue(mockAwsService)
};
