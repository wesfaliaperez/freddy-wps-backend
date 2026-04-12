import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

function buildEvolutionError(status, rawBody) {
  let parsedBody = null;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch (_error) {
    parsedBody = null;
  }

  return {
    status,
    message:
      parsedBody?.message ||
      parsedBody?.response?.message ||
      parsedBody?.error ||
      `Evolution API respondio con estado ${status}`,
    rawBody
  };
}

function normalizeRecipient(value) {
  return String(value || "").replace(/\D/g, "");
}

export async function sendEvolutionTextMessage(to, body) {
  const recipient = normalizeRecipient(to);
  const url = `${env.evolutionApiUrl}/message/sendText/${env.evolutionInstance}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.evolutionApiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      number: recipient,
      text: body,
      delay: 0,
      linkPreview: true
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const errorDetails = buildEvolutionError(response.status, errorBody);

    logger.error("Error enviando mensaje por Evolution", {
      to: recipient,
      instance: env.evolutionInstance,
      status: errorDetails.status,
      body: errorDetails.rawBody
    });

    throw new Error(
      `Evolution API respondio con estado ${errorDetails.status}: ${errorDetails.message}`
    );
  }

  return response.json();
}
