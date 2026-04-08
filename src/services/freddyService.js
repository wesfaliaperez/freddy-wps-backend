import { conversationStore } from "./conversationStore.js";
import { analyzeLead } from "./leadAnalyzer.js";
import { escalateLead } from "./escalationService.js";
import { sendMessage } from "./channelRouter.js";
import { generateFreddyReply } from "./openaiService.js";
import { logger } from "../utils/logger.js";

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

export async function processIncomingWhatsAppMessage({ message, contact }) {
  const userId = message.from;
  const incomingText = extractText(message).trim();

  if (!incomingText) {
    logger.info("Mensaje no soportado o vacio, se omite", {
      userId,
      messageType: message.type
    });
    return;
  }

  const session = conversationStore.getSession(userId);

  if (contact?.profile?.name && !session.profile.name) {
    conversationStore.updateProfile(userId, {
      name: contact.profile.name
    });
  }

  conversationStore.saveMessage(userId, {
    role: "user",
    content: incomingText,
    channel: "whatsapp",
    createdAt: new Date().toISOString()
  });

  const refreshedSession = conversationStore.getSession(userId);
  const analysis = analyzeLead({
    text: incomingText,
    session: refreshedSession
  });
  const wasEscalated = refreshedSession.profile.isEscalated;

  conversationStore.updateProfile(userId, {
    classification: analysis.classification,
    currentIntent: analysis.intent,
    interestTopic: analysis.recommendedTopic || refreshedSession.profile.interestTopic,
    sentFormLink:
      refreshedSession.profile.sentFormLink ||
      (analysis.shouldSendForm ? analysis.selectedFormLink : ""),
    sentPaymentLink:
      refreshedSession.profile.sentPaymentLink || analysis.shouldSendPaymentLink,
    sentWebsiteLink:
      refreshedSession.profile.sentWebsiteLink || analysis.shouldSendWebsiteLink
  });

  const updatedSession = conversationStore.getSession(userId);
  const reply = await generateFreddyReply({
    session: updatedSession,
    incomingText,
    analysis
  });

  await sendMessage({
    channel: "whatsapp",
    to: userId,
    body: reply
  });

  conversationStore.saveMessage(userId, {
    role: "assistant",
    content: reply,
    channel: "whatsapp",
    createdAt: new Date().toISOString()
  });

  if (analysis.shouldEscalate && !wasEscalated) {
    await escalateLead({
      session: updatedSession,
      analysis,
      lastMessage: incomingText
    });

    conversationStore.updateProfile(userId, {
      isEscalated: true
    });
  }
}
