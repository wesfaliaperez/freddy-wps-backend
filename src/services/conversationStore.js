const MAX_HISTORY = 20;

class ConversationStore {
  constructor() {
    this.sessions = new Map();
  }

  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        userId,
        profile: {
          name: "",
          channel: "whatsapp",
          classification: "consulta",
          currentIntent: "general_info",
          interestTopic: "",
          isEscalated: false,
          sentFormLink: "",
          sentPaymentLink: false,
          sentWebsiteLink: false,
          followUpCount: 0,
          lastInteractionAt: new Date().toISOString()
        },
        messages: []
      });
    }

    return this.sessions.get(userId);
  }

  saveMessage(userId, message) {
    const session = this.getSession(userId);
    session.messages.push(message);
    session.messages = session.messages.slice(-MAX_HISTORY);
    session.profile.lastInteractionAt = new Date().toISOString();
    return session;
  }

  updateProfile(userId, updates) {
    const session = this.getSession(userId);
    session.profile = {
      ...session.profile,
      ...updates,
      lastInteractionAt: new Date().toISOString()
    };
    return session;
  }
}

export const conversationStore = new ConversationStore();
