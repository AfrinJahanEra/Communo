import env from "../config/env.js";
import { getTransporter } from "../config/mailer.js";
import logger from "../utils/logger.js";

/**
 * Sends an email. When SMTP is not configured the message is logged instead,
 * so local development works without a mail account.
 */
export const sendMail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();

  if (!mailer) {
    logger.warn({ to, subject, text }, "SMTP not configured — email not sent (logged instead)");
    return { skipped: true };
  }

  const info = await mailer.sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  logger.info({ to, messageId: info.messageId }, "Email sent");
  return { skipped: false, messageId: info.messageId };
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const verificationTemplate = ({ displayName, code, expiresHours }) => `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#0f1115;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#352b49;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;">Your verification code</h1>
                <p style="margin:0 0 20px;color:#c3c9d4;font-size:15px;line-height:1.6;">
                  Hi ${escapeHtml(displayName)}, welcome to Communo. Enter this code on the
                  verification page to activate your account:
                </p>
                <p style="margin:0 0 24px;padding:18px 12px;text-align:center;background:#241d33;border:1px solid #614f83;border-radius:10px;">
                  <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#ffffff;font-family:Consolas,Menlo,monospace;">${code}</span>
                </p>
                <p style="margin:0 0 20px;color:#8b93a3;font-size:13px;line-height:1.6;">
                  The code expires in ${expiresHours} hours and can only be used once.
                  If you did not try to sign up, you can ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const sendVerificationEmail = async (user, code) => {
  const expiresHours = env.EMAIL_VERIFICATION_EXPIRES_HOURS;

  if (!env.isMailConfigured && env.isDevelopment) {
    // Makes the flow testable before any SMTP account exists
    logger.info(`\n\n  Verification code for ${user.email}: ${code}\n`);
  }

  return sendMail({
    to: user.email,
    subject: `Your Communo verification code is ${code}`,
    text: `Welcome to Communo. Your verification code is ${code}. It expires in ${expiresHours} hours and can be used once.`,
    html: verificationTemplate({
      displayName: user.displayName || user.username,
      code,
      expiresHours,
    }),
  });
};