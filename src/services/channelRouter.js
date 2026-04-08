import { sendWhatsAppTextMessage } from "./whatsappService.js";

export async function sendMessage({ channel, to, body }) {
  if (channel === "whatsapp") {
    return sendWhatsAppTextMessage(to, body);
  }

  throw new Error(`Canal no soportado: ${channel}`);
}
