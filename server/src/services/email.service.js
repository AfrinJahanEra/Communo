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

const verificationTemplate = ({ displayName, verifyUrl, expiresHours }) => `
<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#0f1115;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#181b21;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;">Verify your email</h1>
                <p style="margin:0 0 12px;color:#c3c9d4;font-size:15px;line-height:1.6;">
                  Hi ${escapeHtml(displayName)}, welcome to CodeCord. Confirm this address to activate your account.
                </p>
                <p style="margin:24px 0;">
                  <a href="${verifyUrl}"
                     style="display:inline-block;background:#5865f2;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                    Verify email
                  </a>
                </p>
                <p style="margin:0 0 12px;color:#8b93a3;font-size:13px;line-height:1.6;">
                  This link expires in ${expiresHours} hours and can only be used once.
                  If the button does not work, paste this into your browser:
                </p>
                <p style="margin:0 0 20px;color:#5865f2;font-size:12px;word-break:break-all;">${verifyUrl}</p>
                <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
                  Did not create a CodeCord account? You can ignore this email.
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

export const sendVerificationEmail = async (user, rawToken) => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const expiresHours = env.EMAIL_VERIFICATION_EXPIRES_HOURS;

  if (!env.isMailConfigured && env.isDevelopment) {
    // Makes the flow testable before any SMTP account exists
    logger.info(`\n\n  Verification link for ${user.email}:\n  ${verifyUrl}\n`);
  }

  return sendMail({
    to: user.email,
    subject: "Verify your CodeCord email",
    text: `Welcome to CodeCord. Verify your email within ${expiresHours} hours: ${verifyUrl}`,
    html: verificationTemplate({
      displayName: user.displayName || user.username,
      verifyUrl,
      expiresHours,
    }),
  });
};