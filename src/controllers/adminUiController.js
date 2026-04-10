import path from "path";
import { fileURLToPath } from "url";
import { env } from "../config/env.js";
import { getBotConfig, updateBotConfig } from "../services/botConfigStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminUiDir = path.join(__dirname, "..", "admin-ui");

function unauthorized(res) {
  res.set("WWW-Authenticate", 'Basic realm="Freddy Admin"');
  return res.status(401).send("Autenticacion requerida.");
}

export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Basic ")) {
    return unauthorized(res);
  }

  const decoded = Buffer.from(
    authHeader.replace("Basic ", ""),
    "base64"
  ).toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : "";
  const password =
    separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

  if (
    username !== env.adminUsername ||
    password !== env.adminPassword
  ) {
    return unauthorized(res);
  }

  return next();
}

export function renderAdminPage(_req, res) {
  return res.sendFile(path.join(adminUiDir, "index.html"));
}

export function renderAdminAsset(req, res) {
  return res.sendFile(path.join(adminUiDir, req.params.asset));
}

export function getAdminConfig(_req, res) {
  return res.status(200).json(getBotConfig());
}

export function saveAdminConfig(req, res) {
  try {
    const config = updateBotConfig(req.body || {});
    return res.status(200).json({ status: "ok", config });
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: error.message
    });
  }
}
