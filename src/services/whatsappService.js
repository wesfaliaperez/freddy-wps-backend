import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const GRAPH_API_VERSION = "v23.0";

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
    logger.error("Error enviando mensaje de WhatsApp", {
      status: response.status,
      body: errorBody
    });
    throw new Error(`Meta API respondio con estado ${response.status}`);
  }

  return response.json();
}
