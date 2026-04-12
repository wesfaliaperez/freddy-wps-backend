import { conversationStore } from "./conversationStore.js";
import { analyzeLead } from "./freddyLeadAnalyzer.js";
import { escalateLead } from "./escalationService.js";
import { sendMessage } from "./channelRouter.js";
import { generateFreddyReply } from "./freddyReplyService.js";
import { logger } from "../utils/logger.js";

const processedInboundIds = [];
const PROCESSED_IDS_LIMIT = 300;

function extractText(message) {
  if (!message) return "";

  if (message.type === "text") {
    return message.text?.body || "";
  }

  if (message.type === "button") {
    return message.button?.text || "";
  }

  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      ""
    );
  }

  return "";
}

function extractEvolutionText(message) {
  if (!message) return "";

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.listResponseMessage?.title ||
    message.templateButtonReplyMessage?.selectedDisplayText ||
    ""
  );
}

function rememberProcessedId(messageId) {
  if (!messageId) {
    return false;
  }

  if (processedInboundIds.includes(messageId)) {
    return true;
  }

  processedInboundIds.push(messageId);

  if (processedInboundIds.length > PROCESSED_IDS_LIMIT) {
    processedInboundIds.shift();
  }

  return false;
}

async function processIncomingText({
  userId,
  incomingText,
  profileName = "",
  rawMessageType = "text"
}) {
  const cleanUserId = String(userId || "").trim();
  const cleanText = String(incomingText || "").trim();

  if (!cleanText) {
    logger.info("Mensaje no soportado o vacio, se omite", {
      userId: cleanUserId,
      messageType: rawMessageType
    });
    return;
  }

  const session = conversationStore.getSession(cleanUserId);

  if (profileName && !session.profile.name) {
    conversationStore.updateProfile(cleanUserId, {
      name: profileName
    });
  }

  conversationStore.saveMessage(cleanUserId, {
    role: "user",
    content: cleanText,
    channel: "whatsapp",
    createdAt: new Date().toISOString()
  });

  const refreshedSession = conversationStore.getSession(cleanUserId);
  const analysis = analyzeLead({
    text: cleanText,
    session: refreshedSession
  });
  const wasEscalated = refreshedSession.profile.isEscalated;

  conversationStore.updateProfile(cleanUserId, {
    classification: analysis.classification,
    currentIntent: analysis.intent,
    interestTopic:
      analysis.recommendedTopic || refreshedSession.profile.interestTopic,
    sentFormLink:
      refreshedSession.profile.sentFormLink ||
      (analysis.shouldSendForm ? analysis.selectedFormLink : ""),
    sentPaymentLink:
      refreshedSession.profile.sentPaymentLink || analysis.shouldSendPaymentLink,
    sentWebsiteLink:
      refreshedSession.profile.sentWebsiteLink || analysis.shouldSendWebsiteLink
  });

  const updatedSession = conversationStore.getSession(cleanUserId);
  const reply = await generateFreddyReply({
    session: updatedSession,
    incomingText: cleanText,
    analysis
  });

  await sendMessage({
    channel: "whatsapp",
    to: cleanUserId,
    body: reply
  });

  conversationStore.saveMessage(cleanUserId, {
    role: "assistant",
    content: reply,
    channel: "whatsapp",
    createdAt: new Date().toISOString()
  });

  if (analysis.shouldEscalate && !wasEscalated) {
    await escalateLead({
      session: updatedSession,
      analysis,
      lastMessage: cleanText
    });

    conversationStore.updateProfile(cleanUserId, {
      isEscalated: true
    });
  }
}

export async function processIncomingWhatsAppMessage({ message, contact }) {
  const messageId = message?.id;

  if (rememberProcessedId(messageId)) {
    logger.info("Mensaje duplicado de Meta omitido", { messageId });
    return;
  }

  await processIncomingText({
    userId: message.from,
    incomingText: extractText(message),
    profileName: contact?.profile?.name || "",
    rawMessageType: message?.type || "unknown"
  });
}

export async function processIncomingEvolutionMessage({ data }) {
  const messageId = data?.key?.id;

  if (data?.key?.fromMe) {
    logger.info("Evento fromMe de Evolution omitido", { messageId });
    return;
  }

  if (rememberProcessedId(messageId)) {
    logger.info("Mensaje duplicado de Evolution omitido", { messageId });
    return;
  }

  const remoteJid = data?.key?.remoteJid || "";
  const userId = remoteJid.split("@")[0].replace(/\D/g, "");

  await processIncomingText({
    userId,
    incomingText: extractEvolutionText(data?.message),
    profileName: data?.pushName || data?.sender || "",
    rawMessageType: data?.messageType || "unknown"
  });
}
