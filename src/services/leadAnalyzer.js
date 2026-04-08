import {
  FORM_LINKS,
  PAYMENT_LINK,
  RECOVERY_CHANNEL_LINK,
  WEBSITE_LINK
} from "../data/constants.js";

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function pickFormLink(userId) {
  const seed = Array.from(userId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FORM_LINKS[seed % FORM_LINKS.length];
}

export function analyzeLead({ text, session }) {
  const normalized = normalizeText(text);
  const history = session.messages;
  const previousClassification = session.profile.classification;

  let intent = "general_info";
  let classification = previousClassification;
  let shouldEscalate = false;
  let shouldSendForm = false;
  let shouldSendPaymentLink = false;
  let shouldSendWebsiteLink = false;
  let useRecoveryMessage = false;
  let recommendedTopic = session.profile.interestTopic || "";
  let escalationReason = "";

  if (
    hasAny(normalized, [
      "hola",
      "buenas",
      "informacion",
      "info",
      "curso",
      "cursos"
    ]) &&
    history.length <= 1
  ) {
    intent = "welcome";
    classification = "consulta";
  }

  if (
    hasAny(normalized, ["excel", "power bi", "sql", "python", "analisis de datos"])
  ) {
    intent = "course_interest";
    classification = "interesado";

    if (normalized.includes("excel")) recommendedTopic = "Excel Avanzado";
    if (normalized.includes("power bi")) recommendedTopic = "Power BI";
    if (normalized.includes("sql")) recommendedTopic = "SQL para Analisis de Datos";
    if (normalized.includes("python")) recommendedTopic = "Python desde Cero";
    if (normalized.includes("analisis de datos")) {
      recommendedTopic = "Analisis de Datos desde Cero";
    }
  }

  if (
    hasAny(normalized, [
      "precio",
      "costo",
      "cuanto cuesta",
      "inversion",
      "duracion",
      "modalidad",
      "certificado"
    ])
  ) {
    intent = "course_details";
    classification = classification === "caliente" ? "caliente" : "interesado";
  }

  if (
    hasAny(normalized, [
      "inscribirme",
      "inscripcion",
      "formulario",
      "quiero entrar",
      "me interesa",
      "quiero apartar",
      "quiero el curso"
    ])
  ) {
    intent = "enrollment";
    classification = "caliente";
    shouldSendForm = !session.profile.sentFormLink;
  }

  if (
    hasAny(normalized, [
      "pagar",
      "pago",
      "tarjeta",
      "transferencia",
      "quiero pagar",
      "listo para pagar",
      "puedo pagar"
    ])
  ) {
    intent = "payment";
    classification = "caliente";
    shouldSendPaymentLink = !session.profile.sentPaymentLink;
    shouldEscalate = true;
    escalationReason = "Cliente listo para pagar";
  }

  if (
    hasAny(normalized, ["ya pague", "pago realizado", "comprobante", "transferi", "transferencia hecha"])
  ) {
    intent = "payment_confirmed";
    classification = "pago_realizado";
    shouldEscalate = true;
    escalationReason = "Cliente confirma pago realizado";
  }

  if (hasAny(normalized, ["descuento", "rebaja", "oferta"])) {
    shouldEscalate = true;
    escalationReason = "Solicitud de descuento";
  }

  if (hasAny(normalized, ["empresa", "equipo", "grupo", "corporativo"])) {
    intent = "group_sale";
    classification = "caliente";
    shouldEscalate = true;
    escalationReason = "Oportunidad empresarial o grupal";
  }

  if (hasAny(normalized, ["ya tome", "cliente anterior", "he tomado antes"])) {
    shouldEscalate = true;
    escalationReason = "Cliente anterior";
  }

  if (
    hasAny(normalized, [
      "a mi ritmo",
      "pregrabado",
      "grabado",
      "sin horario",
      "flexible"
    ])
  ) {
    intent = "self_paced";
    classification = classification === "consulta" ? "interesado" : classification;
    shouldSendWebsiteLink = !session.profile.sentWebsiteLink;
  }

  if (hasAny(normalized, ["no tengo tiempo", "no puedo ahora"])) {
    intent = "timing_objection";
    shouldSendWebsiteLink = !session.profile.sentWebsiteLink;
    useRecoveryMessage = true;
  }

  if (hasAny(normalized, ["no tengo dinero", "muy caro"])) {
    intent = "budget_objection";
    shouldSendForm = !session.profile.sentFormLink;
    useRecoveryMessage = true;
  }

  if (hasAny(normalized, ["lo pensare", "te aviso", "mas adelante"])) {
    intent = "hesitation";
    useRecoveryMessage = false;
  }

  if (
    hasAny(normalized, [
      "no me interesa",
      "no gracias",
      "en este momento no",
      "no por ahora",
      "ya no"
    ])
  ) {
    intent = "lead_recovery";
    useRecoveryMessage = true;
  }

  if (!recommendedTopic && hasAny(normalized, ["no se", "cual me recomiendas", "que me recomiendas"])) {
    intent = "course_guidance";
    classification = "interesado";
  }

  if (!escalationReason && shouldEscalate) {
    escalationReason = "Alto interes o conversacion compleja";
  }

  return {
    intent,
    classification,
    shouldEscalate,
    shouldSendForm,
    shouldSendPaymentLink,
    shouldSendWebsiteLink,
    useRecoveryMessage,
    recommendedTopic,
    escalationReason,
    selectedFormLink: session.profile.sentFormLink || pickFormLink(session.userId),
    paymentLink: PAYMENT_LINK,
    websiteLink: WEBSITE_LINK,
    recoveryChannelLink: RECOVERY_CHANNEL_LINK
  };
}
