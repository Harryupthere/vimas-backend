import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.HOSTINGER_HOST, // e.g., smtp.hostinger.com
      port: 465,
      secure: true,
      auth: {
        user: process.env.HOSTINGER_EMAIL, // e.g. support@domain.com
        pass: process.env.HOSTINGER_PASSWORD,
      },
    });
  }

  private loadTemplate(
    templateName: string,
    replacements: Record<string, any>,
  ): string {
    const rootDir = process.cwd(); // always points to project root
    const filePath = path.join(
      rootDir,
      'src',
      'email',
      'templates',
      `${templateName}.html`,
    );
    const source = fs.readFileSync(filePath, 'utf8');
    const template = handlebars.compile(source);
    return template(replacements);
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    replacements: Record<string, any>,
  ): Promise<void> {
    try {
      const html = this.loadTemplate(templateName, replacements);

      await this.transporter.sendMail({
        from: `"Tradelive24 Team" <${process.env.HOSTINGER_EMAIL}>`,
        to,
        subject,
        html,
      });

      console.log(`✅ Email sent to ${to} using template: ${templateName}`);
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
