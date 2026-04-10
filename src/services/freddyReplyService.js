import OpenAI from "openai";
import { env } from "../config/env.js";
import { getBotConfig } from "./botConfigStore.js";
import { logger } from "../utils/logger.js";

const openai = new OpenAI({
  apiKey: env.openAiApiKey
});

function getActiveCourses(config) {
  return (config.courses || []).filter((course) => course.active !== false);
}

function findConfiguredCourse(config, courseName) {
  return getActiveCourses(config).find((course) => course.name === courseName);
}

function buildCourseGuidance(config) {
  return getActiveCourses(config)
    .slice(0, 5)
    .map((course) => `${course.name}: ${course.summary}`)
    .join("; ");
}

function buildSystemPrompt(config, analysis, session) {
  return `Eres ${config.business.assistantName}, asesor comercial oficial de ${config.business.companyName}.

Hablas de forma ${config.tone.style}.
Escribes con muy buena ortografia en espanol.
No usas lenguaje robotico.
No inventas datos.
No das fechas especificas.
No presionas de forma agresiva.

Contexto del negocio:
- Sitio oficial correcto: ${config.business.websiteLink}
- Precio base: ${config.commercial.defaultPrice}
- Duracion base: ${config.commercial.defaultDuration}
- Modalidad base: ${config.commercial.defaultModality}
- Incluye: ${config.commercial.includes.join(", ")}
- Cursos: ${config.courses
    .map((course) => `${course.name} (${course.summary})`)
    .join("; ")}
- Reglas extra de tono: ${config.tone.customInstructions || "ninguna"}

Contexto interno:
- Clasificacion actual: ${analysis.classification}
- Intencion detectada: ${analysis.intent}
- Nombre del cliente: ${session.profile.name || "No disponible"}
- Curso detectado: ${analysis.matchedCourse?.name || analysis.recommendedTopic || "No definido"}
- Link de inscripcion sugerido para esta conversacion: ${analysis.selectedFormLink || "No aplica"}

Instrucciones:
- Responde en maximo 120 palabras.
- Responde exactamente a la ultima pregunta del cliente.
- Si compartes un enlace, explica primero para que sirve.
- No compartas mas de un formulario por conversacion.
- Si el cliente pide inscripcion o enlace, usa el link de inscripcion sugerido de esta conversacion.
- Si el cliente pregunta por un curso, prioriza el precio, duracion, modalidad y resumen del curso detectado.
- Si el usuario rechaza la oferta, responde con empatia y deja la puerta abierta.`;
}

function toConversationInput(session, incomingText) {
  const latest = session.messages.slice(-8).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content
  }));

  return latest.length
    ? latest
    : [{ role: "user", content: incomingText }];
}

function buildDeterministicReply(analysis, config) {
  const selectedCourse =
    analysis.matchedCourse || findConfiguredCourse(config, analysis.recommendedTopic);

  switch (analysis.intent) {
    case "quality_complaint":
      return "Tienes razon, gracias por decirmelo. Voy a corregir eso de inmediato. Si quieres, dime que curso te interesa o que informacion necesitas y con gusto te ayudo.";
    case "payment":
      return `Puedes realizar el pago por transferencia a nombre de WPS Consulting Group o Wesfalia Perez. Si prefieres tarjeta, puedes usar este enlace: ${analysis.paymentLink}. La plataforma puede aplicar una pequena comision. Si quieres, tambien te conecto con una asesora para finalizar el proceso.`;
    case "payment_confirmed":
      return "Perfecto. Gracias por confirmarlo. Te voy a conectar directamente con nuestra asesora para validar tu pago y continuar con el proceso.";
    case "enrollment":
      return `Te dejo el formulario de inscripcion${selectedCourse ? ` para ${selectedCourse.name}` : ""}. Es rapido de completar y con eso aseguramos tu cupo: ${analysis.selectedFormLink}`;
    case "lead_recovery":
      return `${config.responses.leadRecovery} Te comparto nuestro canal de WhatsApp: ${analysis.recoveryChannelLink}`;
    case "timing_objection":
      return `${config.responses.timingObjection} Puedes verlos aqui: ${analysis.websiteLink}`;
    case "budget_objection":
      return `${config.responses.budgetObjection} ${analysis.selectedFormLink}`;
    case "hesitation":
      return config.responses.hesitation;
    case "self_paced":
      return `Si prefieres aprender a tu ritmo, tambien puedes acceder a nuestros cursos pregrabados aqui: ${analysis.websiteLink}`;
    case "group_sale":
      return config.responses.escalation;
    default:
      return "";
  }
}

function fallbackReply(analysis, config) {
  const selectedCourse =
    analysis.matchedCourse || findConfiguredCourse(config, analysis.recommendedTopic);

  if (analysis.recommendedTopic) {
    return `Por lo que me cuentas, te recomendaria ${analysis.recommendedTopic}. ${selectedCourse?.summary || "Es una opcion muy practica para desarrollar esa habilidad."} La inversion es ${selectedCourse?.price || config.commercial.defaultPrice} y la duracion es ${selectedCourse?.duration || config.commercial.defaultDuration}. Si quieres, te explico si ese curso es el mas conveniente para ti o te sugiero otra opcion.`;
  }

  if (analysis.shouldEscalate) {
    return config.responses.escalation;
  }

  return "Con gusto te ayudo. Tenemos capacitaciones practicas en Excel, Power BI, SQL, Python y Analisis de Datos. Cuentame que te interesa aprender y te oriento.";
}

export async function generateFreddyReply({ session, incomingText, analysis }) {
  const config = getBotConfig();

  if (analysis.intent === "welcome" && session.messages.length <= 1) {
    return config.welcomeMessage;
  }

  const deterministicReply = buildDeterministicReply(analysis, config);
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
          content: buildSystemPrompt(config, analysis, session)
        },
        ...toConversationInput(session, incomingText)
      ]
    });

    return (
      response.choices?.[0]?.message?.content?.trim() ||
      fallbackReply(analysis, config)
    );
  } catch (error) {
    logger.error("Fallo al generar respuesta con OpenAI", {
      error: error.message
    });
    return fallbackReply(analysis, config);
  }
}
