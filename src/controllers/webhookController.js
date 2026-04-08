import { env } from "../config/env.js";
import { processIncomingWhatsAppMessage } from "../services/freddyService.js";
import { logger } from "../utils/logger.js";

export function verifyWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

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

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const message of messages) {
          const contact = contacts.find((item) => item.wa_id === message.from);
          await processIncomingWhatsAppMessage({ message, contact });
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    logger.error("Error procesando webhook", {
      error: error.message,
      stack: error.stack
    });
    return res.sendStatus(500);
  }
}
