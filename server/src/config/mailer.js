import nodemailer from "nodemailer";
import env from "./env.js";
import logger from "../utils/logger.js";

let transporter = null;

/**
 * Lazily builds the SMTP transporter. Returns null when SMTP is not
 * configured so callers can fall back to logging instead of crashing.
 */
export const getTransporter = () => {
  if (!env.isMailConfigured) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

/** Optional startup check — call from server.js to fail loudly on bad credentials. */
export const verifyMailer = async () => {
  const mailer = getTransporter();

  if (!mailer) {
    logger.warn("SMTP not configured — verification emails will be logged, not sent");
    return false;
  }

  try {
    await mailer.verify();
    logger.info(`SMTP ready: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    return true;
  } catch (error) {
    logger.error(`SMTP connection failed: ${error.message}`);
    return false;
  }
};