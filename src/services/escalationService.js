import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

function createTransporter() {
  if (
    env.alertLogOnly ||
    !env.smtpHost ||
    !env.smtpUser ||
    !env.smtpPass
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });
}

const transporter = createTransporter();

export async function escalateLead({ session, analysis, lastMessage }) {
  const summary = {
    nombre: session.profile.name || "No identificado",
    whatsapp: session.userId,
    interes: analysis.recommendedTopic || "Pendiente de definir",
    estado: analysis.classification,
    motivo: analysis.escalationReason,
    resumen: lastMessage
  };

  logger.warn("Escalamiento Freddy", summary);

  if (!transporter) {
    return;
  }

  await transporter.sendMail({
    from: env.smtpUser,
    to: env.escalationEmail,
    subject: `Escalamiento Freddy | ${summary.estado} | ${summary.whatsapp}`,
    text: `Nuevo lead para escalar

Nombre: ${summary.nombre}
WhatsApp: ${summary.whatsapp}
Interes: ${summary.interes}
Estado: ${summary.estado}
Motivo: ${summary.motivo}
Resumen: ${summary.resumen}

Escalar a:
WhatsApp: ${env.escalationWhatsappNumber}
Correo: wesfalia@wpsconsultingroup.com`
  });
}
