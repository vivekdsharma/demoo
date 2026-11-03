import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';

let transporter: Transporter | null = null;
let testAccount: any = null;

export async function getEtherealTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  if (config.ethereal.user && config.ethereal.pass) {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: config.ethereal.user,
        pass: config.ethereal.pass,
      },
    });
    console.log('[Ethereal] Configured SMTP with provided credentials');
    return transporter;
  }

  try {
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Ethereal] Created test account: ${testAccount.user}`);
    console.log(`[Ethereal] Web view inbox: https://ethereal.email/login`);
    return transporter;
  } catch (error) {
    console.error('[Ethereal] Failed to initialize test account:', error);
    throw error;
  }
}

export interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  const mailer = await getEtherealTransporter();

  // Parse any base64 data URLs in attachments
  const mailAttachments = options.attachments?.map((att) => {
    let rawContent = att.content;
    let encoding: string | undefined = undefined;

    if (rawContent.startsWith('data:')) {
      const match = rawContent.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        rawContent = match[2];
        encoding = 'base64';
      }
    }

    return {
      filename: att.filename,
      content: rawContent,
      encoding,
      contentType: att.contentType,
    };
  });

  const info = await mailer.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text || options.html?.replace(/<[^>]*>?/gm, '') || '',
    html: options.html || options.text || '',
    attachments: mailAttachments,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  return {
    messageId: info.messageId,
    previewUrl,
  };
}
