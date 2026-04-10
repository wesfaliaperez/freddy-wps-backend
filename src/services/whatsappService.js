import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const GRAPH_API_VERSION = "v23.0";

function buildWhatsAppError(status, rawBody) {
  let parsedBody = null;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch (_error) {
    parsedBody = null;
  }

  const metaError = parsedBody?.error;
  const message = metaError?.message || `Meta API respondió con estado ${status}`;
  const code = metaError?.code;

  return {
    status,
    code,
    message,
    rawBody
  };
}

export async function sendWhatsAppTextMessage(to, body) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.whatsappPhoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: true,
        body
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const errorDetails = buildWhatsAppError(response.status, errorBody);

    logger.error("Error enviando mensaje de WhatsApp", {
      to,
      phoneNumberId: env.whatsappPhoneNumberId,
      status: errorDetails.status,
      code: errorDetails.code,
      body: errorDetails.rawBody
    });

    throw new Error(
      `Meta API respondió con estado ${errorDetails.status}: ${errorDetails.message}`
    );
  }

  return response.json();
}
