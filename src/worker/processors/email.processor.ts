import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EMAIL_SEND_JOB_NAME } from '../../constants/queues';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost{
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    super()
  }
  async process(job: Job<any, any, string>): Promise<void> {
    switch (job.name) {
      case EMAIL_SEND_JOB_NAME: {
        const res = await this.mailerService.sendMail(job.data)
        Logger.log(res)
      }
      default: {
        Logger.log(`Unknown job name: ${job.name}`);
      }
    }
    
  }
}

