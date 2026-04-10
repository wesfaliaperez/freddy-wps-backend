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
    extras.push(
      "Si la persona pregunta cómo pagar, explica brevemente transferencia y pago con tarjeta antes de escalar."
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

  return latest.length ? latest : [{ role: "user", content: incomingText }];
}

export async function generateFreddyReply({ session, incomingText, analysis }) {
  if (analysis.intent === "welcome" && session.messages.length <= 1) {
    return WELCOME_MESSAGE;
  }

  const deterministicReply = buildDeterministicReply(analysis);
  if (deterministicReply) {
    return deterministicReply;
  }

  try {
    const response = await openai.chat.completions.create({
      model: env.openAiModel,
      temperature: 0.5,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content: `${FREDDY_SYSTEM_PROMPT}

Contexto interno:
- Clasificación actual: ${analysis.classification}
- Intención detectada: ${analysis.intent}
- Nombre del cliente: ${session.profile.name || "No disponible"}
- Reglas extra:
${buildBusinessContext(analysis)}

Instrucciones de salida:
- Responde en español natural.
- Máximo 120 palabras.
- Usa excelente ortografía.
- No uses formato markdown complejo.
- Si compartes un enlace, explica primero para qué sirve.
- No compartas más de un formulario por conversación.
- Si el usuario quiere pagar, responde a esa pregunta y luego ofrece conectar con una asesora.
- Si el usuario rechaza la oferta, no insistas; responde con empatía y conserva la relación.`
        },
        ...toConversationInput(session, incomingText)
      ]
    });

    return response.choices?.[0]?.message?.content?.trim() || fallbackReply(analysis);
  } catch (error) {
    logger.error("Fallo al generar respuesta con OpenAI", {
      error: error.message
    });
    return fallbackReply(analysis);
  }
}

function buildDeterministicReply(analysis) {
  switch (analysis.intent) {
    case "quality_complaint":
      return "Tienes razón, gracias por decírmelo. Corregiré eso de inmediato. Si quieres, dime qué curso te interesa o qué información necesitas y con gusto te ayudo.";
    case "payment":
      return `Puedes realizar el pago por transferencia a nombre de WPS Consulting Group o Wesfalia Pérez. Si prefieres tarjeta, puedes usar este enlace: ${analysis.paymentLink}. La plataforma puede aplicar una pequeña comisión. Si quieres, también te conecto con una asesora para ayudarte a finalizar el proceso.`;
    case "payment_confirmed":
      return "¡Perfecto! Gracias por confirmarlo 🙌 Te voy a conectar directamente con nuestra asesora para validar tu pago y continuar con el proceso.";
    case "enrollment":
      return `Te dejo el formulario de inscripción 👇 Es rápido de completar y con eso aseguramos tu cupo: ${analysis.selectedFormLink}`;
    case "lead_recovery":
      return `Es una pena que en esta ocasión no puedas participar 😔 De todas formas, nos encantaría mantenernos en contacto contigo para futuras capacitaciones. Te comparto nuestro canal de WhatsApp donde publicamos vacantes, contenido de valor y novedades del mundo de datos e inteligencia artificial 🚀 ${analysis.recoveryChannelLink}`;
    case "timing_objection":
      return `Te entiendo 🙌 Tenemos opciones flexibles y también cursos pregrabados para que avances a tu ritmo. Puedes verlos aquí: ${analysis.websiteLink}`;
    case "budget_objection":
      return `Perfecto, lo entiendo 🙌 Si quieres, puedes completar este formulario y te contactamos cuando abras un próximo grupo: ${analysis.selectedFormLink}`;
    case "hesitation":
      return "Buenísimo 😊 Si quieres, te guardo el cupo mientras decides o te explico cuál curso encaja mejor contigo.";
    case "self_paced":
      return `Si prefieres aprender a tu ritmo, también puedes acceder a nuestros cursos pregrabados aquí: ${analysis.websiteLink}`;
    case "course_guidance":
      return "Claro. Si buscas algo práctico para oficina, Excel es muy buena base. Si te interesa visualización, Power BI. SQL te ayuda con bases de datos, Python con automatización y análisis avanzado, y Análisis de Datos te da una visión general. ¿Cuál de esas áreas te llama más la atención?";
    case "course_details":
      return "Todos nuestros cursos son online, duran entre 4 y 6 semanas, tienen una inversión de RD$3,500 e incluyen certificado, materiales, casos prácticos, proyecto final y soporte. Si me dices cuál curso te interesa, te oriento mejor.";
    case "group_sale":
      return "Perfecto 🙌 Te voy a conectar directamente con nuestra asesora para ayudarte mejor con la propuesta para empresa o grupo y finalizar el proceso.";
    default:
      return "";
  }
}

function fallbackReply(analysis) {
  if (analysis.intent === "quality_complaint") {
    return "Tienes razón, gracias por decírmelo. Corrijo eso de inmediato. Estoy aquí para ayudarte con la información que necesites sobre nuestros cursos.";
  }

  if (analysis.shouldSendPaymentLink) {
    return `Puedes pagar por transferencia a nombre de WPS Consulting Group o Wesfalia Pérez, o con tarjeta aquí: ${analysis.paymentLink}. La plataforma puede aplicar una pequeña comisión. Si quieres, también te conecto con una asesora para finalizar el proceso.`;
  }

  if (analysis.shouldSendForm) {
    return `Te comparto el formulario de inscripción. Es rápido de completar y con eso aseguramos tu cupo: ${analysis.selectedFormLink}`;
  }

  if (analysis.shouldSendWebsiteLink) {
    return `Si prefieres aprender a tu ritmo, también puedes ver nuestros cursos pregrabados aquí: ${analysis.websiteLink}`;
  }

  if (analysis.useRecoveryMessage) {
    return `Es una pena que en esta ocasión no puedas participar. De todas formas, nos encantaría mantenernos en contacto contigo para futuras capacitaciones. Te comparto nuestro canal de WhatsApp donde publicamos vacantes, contenido de valor y novedades: ${analysis.recoveryChannelLink}`;
  }

  if (analysis.recommendedTopic) {
    return `Por lo que me cuentas, te recomendaría ${analysis.recommendedTopic}. Todos nuestros cursos son online, duran entre 4 y 6 semanas y tienen una inversión de RD$3,500. Si quieres, te explico si ese curso es el más conveniente para ti o te sugiero otra opción.`;
  }

  if (analysis.shouldEscalate) {
    return "Perfecto, te voy a conectar directamente con nuestra asesora para ayudarte mejor y finalizar el proceso.";
  }

  return "Con gusto te ayudo. Tenemos capacitaciones prácticas en Excel, Power BI, SQL, Python y Análisis de Datos. Cuéntame qué te interesa aprender y te oriento.";
}
