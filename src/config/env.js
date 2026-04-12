import dotenv from "dotenv";

dotenv.config();

const SUPPORTED_PROVIDERS = ["meta", "evolution"];

export function validateEnv() {
  const provider = process.env.WHATSAPP_PROVIDER || "meta";

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(
      `WHATSAPP_PROVIDER no soportado: ${provider}. Usa uno de: ${SUPPORTED_PROVIDERS.join(", ")}`
    );
  }

  const commonRequired = ["OPENAI_API_KEY"];
  const providerRequired =
    provider === "evolution"
      ? ["EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE"]
      : [
          "WHATSAPP_VERIFY_TOKEN",
          "WHATSAPP_ACCESS_TOKEN",
          "WHATSAPP_PHONE_NUMBER_ID"
        ];
  const missing = [...commonRequired, ...providerRequired].filter(
    (key) => !process.env[key]
  );

  if (missing.length) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(", ")}`
    );
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  whatsappProvider: process.env.WHATSAPP_PROVIDER || "meta",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "freddy-admin-2026",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  evolutionApiUrl: (process.env.EVOLUTION_API_URL || "").replace(/\/$/, ""),
  evolutionApiKey: process.env.EVOLUTION_API_KEY || "",
  evolutionInstance: process.env.EVOLUTION_INSTANCE || "",
  evolutionWebhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET || "",
  escalationEmail:
    process.env.WPS_ESCALATION_EMAIL || "wesfalia@wpsconsultingroup.com",
  escalationWhatsappNumber:
    process.env.WPS_ESCALATION_WHATSAPP_NUMBER || "8099772540",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || "false") === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  alertLogOnly: String(process.env.ALERT_LOG_ONLY || "true") === "true"
};
