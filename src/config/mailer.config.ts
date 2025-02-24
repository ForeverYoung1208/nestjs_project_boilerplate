import { Logger } from '@nestjs/common';
import { join } from 'path';
import { MailerTransport } from '../constants/system';
import MailMessage from 'nodemailer/lib/mailer/mail-message';
import {
  MailerOptions,
  TransportType,
} from '@nestjs-modules/mailer/dist/interfaces/mailer-options.interface';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';

export const getTransport = (): TransportType => {
  if (process.env.MAILER_TRANSPORT === MailerTransport.smtp) {
    return {
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT, 10),
      secure: process.env.MAIL_ENCRYPTION === 'true',
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.MAIL_TLS === 'true',
      },
    };
  }
  return {
    jsonTransport: true,
    logger: true,
    debug: true,
    send: (mail: MailMessage) => {
      Logger.log(
        `MAIL LOG: from:${mail.data.from}, to: ${mail.data.to}, subj: ${mail.data.subject}`,
      );
    },
  };
};

export const mailerConfig = (): MailerOptions => ({
  transport: getTransport(),
  defaults: {
    from: process.env.MAIL_FROM_EMAIL,
  },
  preview: false,
  template: {
    adapter: new EjsAdapter(),
    dir: join(__dirname, '../', 'modules/email/templates'),
  },
});
