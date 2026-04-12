import { env } from "../config/env.js";
import {
  processIncomingEvolutionMessage,
  processIncomingWhatsAppMessage
} from "../services/freddyService.js";
import { logger } from "../utils/logger.js";

function isEvolutionPayload(body) {
  return Boolean(body?.event && body?.data);
}

function isEvolutionAuthorized(req) {
  if (!env.evolutionWebhookSecret) {
    return true;
  }

  const providedToken =
    req.headers.apikey ||
    req.headers["x-api-key"] ||
    req.headers["x-evolution-apikey"] ||
    req.body?.apikey ||
    "";

  return providedToken === env.evolutionWebhookSecret;
}

export function verifyChannelWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!mode && !token && !challenge) {
    return res.status(200).json({
      status: "ok",
      provider: env.whatsappProvider,
      message:
        env.whatsappProvider === "meta"
          ? "Endpoint de webhook activo. La verificacion de Meta requiere parametros."
          : "Endpoint de webhook activo para Evolution API."
    });
  }

  if (env.whatsappProvider !== "meta") {
    return res.status(200).json({
      status: "ok",
      provider: env.whatsappProvider,
      message: "Verificacion GET no requerida para Evolution API."
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

export async function receiveChannelWebhook(req, res) {
  try {
    if (isEvolutionPayload(req.body)) {
      if (!isEvolutionAuthorized(req)) {
        logger.warn("Webhook de Evolution rechazado por token invalido");
        return res.sendStatus(403);
      }

      const { event, data, instance } = req.body;

      if (event !== "messages.upsert") {
        logger.info("Evento de Evolution omitido", { event, instance });
        return res.sendStatus(200);
      }

      await processIncomingEvolutionMessage({ data, instance });
      logger.info("Webhook de Evolution procesado", {
        event,
        instance,
        messageId: data?.key?.id
      });
      return res.sendStatus(200);
    }

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
