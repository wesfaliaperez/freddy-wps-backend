import {
  FORM_LINKS,
  PAYMENT_LINK,
  RECOVERY_CHANNEL_LINK,
  WEBSITE_LINK
} from "../data/constants.js";
import { getBotConfig } from "./botConfigStore.js";

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getActiveCourses(config) {
  return (config.courses || []).filter((course) => course.active !== false);
}

function getCourseKeywords(course) {
  const base = Array.isArray(course.keywords) ? course.keywords : [];
  return [...new Set([course.name, ...base].map((value) => normalizeText(value)))];
}

function findMatchingCourse(text, config) {
  return getActiveCourses(config).find((course) =>
    getCourseKeywords(course).some((keyword) => keyword && text.includes(keyword))
  );
}

function getFormUrl(form) {
  if (!form) return "";
  return typeof form === "string" ? form : form.url || "";
}

function pickFormLink(userId, config, matchedCourse) {
  if (matchedCourse?.enrollmentLink) {
    return matchedCourse.enrollmentLink;
  }

  const scopedForms = (config.forms || []).filter((form) => {
    if (typeof form === "string") return true;
    if (!form.course) return true;
    return normalizeText(form.course) === normalizeText(matchedCourse?.name || "");
  });

  const source = scopedForms.length ? scopedForms : config.forms?.length ? config.forms : FORM_LINKS;
  const seed = Array.from(userId).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );
  return getFormUrl(source[seed % source.length]);
}

export function analyzeLead({ text, session }) {
  const config = getBotConfig();
  const normalized = normalizeText(text);
  const history = session.messages;
  const previousClassification = session.profile.classification;
  const matchedCourse = findMatchingCourse(normalized, config);

  let intent = "general_info";
  let classification = previousClassification;
  let shouldEscalate = false;
  let shouldSendForm = false;
  let shouldSendPaymentLink = false;
  let shouldSendWebsiteLink = false;
  let useRecoveryMessage = false;
  let recommendedTopic = session.profile.interestTopic || "";
  let escalationReason = "";

  if (hasAny(normalized, ["ortografia", "escribes mal", "redaccion"])) {
    intent = "quality_complaint";
  }

  if (
    hasAny(normalized, ["hola", "buenas", "informacion", "info", "curso"]) &&
    history.length <= 1
  ) {
    intent = "welcome";
    classification = "consulta";
  }

  if (matchedCourse) {
    intent = "course_interest";
    classification = "interesado";
    recommendedTopic = matchedCourse.name;
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
      "quiero el curso",
      "enviame el enlace"
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
    hasAny(normalized, [
      "ya pague",
      "pago realizado",
      "comprobante",
      "transferi",
      "transferencia hecha"
    ])
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
  }

  if (
    hasAny(normalized, [
      "no me interesa",
      "no gracias",
      "en este momento no",
      "no por ahora",
      "ya no",
      "no quiero nada",
      "dejalo asi"
    ])
  ) {
    intent = "lead_recovery";
    useRecoveryMessage = true;
  }

  if (
    !recommendedTopic &&
    hasAny(normalized, ["no se", "cual me recomiendas", "que me recomiendas"])
  ) {
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
    matchedCourse,
    escalationReason,
    selectedFormLink:
      session.profile.sentFormLink || pickFormLink(session.userId, config, matchedCourse),
    paymentLink: config.business.paymentLink || PAYMENT_LINK,
    websiteLink: config.business.websiteLink || WEBSITE_LINK,
    recoveryChannelLink:
      config.business.recoveryChannelLink || RECOVERY_CHANNEL_LINK
  };
}
