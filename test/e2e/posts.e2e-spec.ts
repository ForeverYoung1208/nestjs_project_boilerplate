import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { appBuilder } from '../app-factories/default-app.factory';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await appBuilder();
    await app.init();
  });
  
  afterAll(async () => {
    await app.close();
  })

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
