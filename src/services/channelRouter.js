import { env } from "../config/env.js";
import { sendEvolutionTextMessage } from "./evolutionService.js";
import { sendWhatsAppTextMessage } from "./whatsappService.js";

export async function sendMessage({ channel, to, body }) {
  if (channel === "whatsapp") {
    if (env.whatsappProvider === "evolution") {
      return sendEvolutionTextMessage(to, body);
    }

    return sendWhatsAppTextMessage(to, body);
  }

  throw new Error(`Canal no soportado: ${channel}`);
}
