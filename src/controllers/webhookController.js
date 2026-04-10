import { env } from "../config/env.js";
import { processIncomingWhatsAppMessage } from "../services/freddyService.js";
import { logger } from "../utils/logger.js";

export function verifyWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!mode && !token && !challenge) {
    return res.status(200).json({
      status: "ok",
      message: "Endpoint de webhook activo. La verificación requiere parámetros de Meta."
    });
  }

  if (mode === "subscribe" && token === env.whatsappVerifyToken) {
    logger.info("Webhook de Meta verificado correctamente");
    return res.status(200).send(challenge);
  }

  logger.warn("Intento fallido de verificacion de webhook", {
    mode,
    tokenProvided: Boolean(token)
  });
  return res.sendStatus(403);
}

export async function receiveWebhook(req, res) {
  try {
    const entries = req.body?.entry || [];
    let processedMessages = 0;
    let failedMessages = 0;

    if (!entries.length) {
      logger.info("Webhook recibido sin mensajes procesables");
      return res.sendStatus(200);
    }

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const message of messages) {
          const contact = contacts.find((item) => item.wa_id === message.from);
          try {
            await processIncomingWhatsAppMessage({ message, contact });
            processedMessages += 1;
          } catch (error) {
            failedMessages += 1;
            logger.error("Fallo procesando mensaje individual del webhook", {
              error: error.message,
              stack: error.stack,
              from: message.from,
              type: message.type
            });
          }
        }
      }
    }

    logger.info("Webhook procesado", {
      processedMessages,
      failedMessages
    });

    return res.sendStatus(200);
  } catch (error) {
    logger.error("Error procesando webhook", {
      error: error.message,
      stack: error.stack
    });
    return res.sendStatus(200);
  }
}
