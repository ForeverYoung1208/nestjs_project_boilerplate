import { EmailJobProducer } from './email-job.producer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Post } from '../../../entities/post.entity';

@Injectable()
export class EmailService {
  constructor(
    private readonly emailJobProducerService: EmailJobProducer,
    private readonly configService: ConfigService,
  ) {}

  async sendPostCreatedNotificationMail(
    emailAdress: string,
    post: Post,
  ): Promise<boolean> {
    const { companyName } = this.getCompanyInfo();

    await this.emailJobProducerService.addJob({
      to: emailAdress,
      subject: 'New post is created',
      template: 'register-invitation',
      context: { companyName, email: emailAdress, post },
      attachments: [],
    });

    return true;
  }
  
  private getCompanyInfo() {
    return {
      companyName: this.configService.get('COMPANY_NAME'),
    };
  }
}
