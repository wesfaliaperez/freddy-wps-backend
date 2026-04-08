import OpenAI from "openai";
import { env } from "../config/env.js";
import { FREDDY_SYSTEM_PROMPT, WELCOME_MESSAGE } from "../data/constants.js";
import { logger } from "../utils/logger.js";

const openai = new OpenAI({
  apiKey: env.openAiApiKey
});

function buildBusinessContext(analysis) {
  const extras = [];

  if (analysis.recommendedTopic) {
    extras.push(`Curso recomendado: ${analysis.recommendedTopic}`);
  }

  if (analysis.shouldSendForm) {
    extras.push(
      `Si compartes formulario, usa solo este enlace y explica breve: ${analysis.selectedFormLink}`
    );
  }

  if (analysis.shouldSendPaymentLink) {
    extras.push(
      `Si compartes pago por tarjeta, usa solo este enlace: ${analysis.paymentLink}. Menciona que la plataforma puede aplicar una pequena comision.`
    );
  }

  if (analysis.shouldSendWebsiteLink) {
    extras.push(
      `Si hablas de cursos pregrabados o aprendizaje a ritmo propio, comparte este sitio: ${analysis.websiteLink}`
    );
  }

  if (analysis.useRecoveryMessage) {
    extras.push(
      `Si el cliente no puede continuar ahora, deja la puerta abierta y comparte este canal de WhatsApp: ${analysis.recoveryChannelLink}`
    );
  }

  if (analysis.shouldEscalate) {
    extras.push(
      "Indica que una asesora humana continuara el proceso usando un tono cercano y profesional."
    );
  }

  return extras.join("\n");
}

function toConversationInput(session, incomingText) {
  const latest = session.messages.slice(-8).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content
  }));

  return [
    ...latest,
    {
      role: "user",
      content: incomingText
    }
  ];
}

export async function generateFreddyReply({ session, incomingText, analysis }) {
  if (analysis.intent === "welcome" && session.messages.length <= 1) {
    return WELCOME_MESSAGE;
  }

  try {
    const response = await openai.responses.create({
      model: env.openAiModel,
      instructions: `${FREDDY_SYSTEM_PROMPT}

Contexto interno:
- Clasificacion actual: ${analysis.classification}
- Intencion detectada: ${analysis.intent}
- Nombre del cliente: ${session.profile.name || "No disponible"}
- Reglas extra:
${buildBusinessContext(analysis)}

Instrucciones de salida:
- Responde en espanol natural.
- Maximo 120 palabras.
- No uses formato markdown complejo.
- Si compartes un enlace, explica primero para que sirve.
- No compartas mas de un formulario por conversacion.
- Si el usuario quiere pagar o requiere atencion especial, confirma el escalamiento sin sonar robotico.`,
      input: toConversationInput(session, incomingText),
      text: {
        verbosity: "low"
      }
    });

    return response.output_text?.trim() || fallbackReply(analysis);
  } catch (error) {
    logger.error("Fallo al generar respuesta con OpenAI", {
      error: error.message
    });
    return fallbackReply(analysis);
  }
}

function fallbackReply(analysis) {
  if (analysis.shouldEscalate) {
    return "Perfecto, te voy a conectar directamente con nuestra asesora para ayudarte mejor y finalizar el proceso.";
  }

  if (analysis.shouldSendPaymentLink) {
    return `Puedes realizar el pago con tarjeta aqui: ${analysis.paymentLink}. La plataforma puede aplicar una pequena comision.`;
  }

  if (analysis.shouldSendForm) {
    return `Te comparto el formulario de inscripcion. Es rapido de completar y con eso aseguramos tu cupo: ${analysis.selectedFormLink}`;
  }

  if (analysis.shouldSendWebsiteLink) {
    return `Si prefieres aprender a tu ritmo, tambien puedes ver nuestros cursos pregrabados aqui: ${analysis.websiteLink}`;
  }

  if (analysis.useRecoveryMessage) {
    return `Es una pena que en esta ocasion no puedas participar. De todas formas, nos encantaria mantenernos en contacto contigo para futuras capacitaciones. Te comparto nuestro canal de WhatsApp: ${analysis.recoveryChannelLink}`;
  }

  if (analysis.recommendedTopic) {
    return `Por lo que me cuentas, te recomendaria ${analysis.recommendedTopic}. Todos nuestros cursos son online, duran entre 4 y 6 semanas y tienen una inversion de RD$3,500. Si quieres, te explico cual te conviene mas.`;
  }

  return "Con gusto te ayudo. Tenemos capacitaciones practicas en Excel, Power BI, SQL, Python y Analisis de Datos. Cuentame que te interesa aprender y te orientare.";
}
