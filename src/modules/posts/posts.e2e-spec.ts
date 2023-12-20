import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { appBuilder } from '../../../test/helpers/default-app.factory';
import { VALIDATION_PIPE_OPTIONS } from '../../constants';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const openedAppTestingModule = await appBuilder();
    const appModule = await openedAppTestingModule.compile();
    app = await appModule.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  it('(POST) /posts ', async () => {
    const res = await request(app.getHttpServer())
      .post('/posts')
      .send({
        title: 'test',
        content: 'test',
      })
      .expect(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      title: 'test',
      content: 'test',
    });
  });
});
