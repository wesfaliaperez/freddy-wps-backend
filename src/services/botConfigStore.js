import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, "..", "data", "bot-config.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeObjects(current, updates) {
  if (Array.isArray(current) || Array.isArray(updates)) {
    return updates;
  }

  const result = { ...current };

  for (const [key, value] of Object.entries(updates || {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current?.[key] &&
      typeof current[key] === "object" &&
      !Array.isArray(current[key])
    ) {
      result[key] = mergeObjects(current[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function readConfig() {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

export function getBotConfig() {
  return clone(readConfig());
}

export function updateBotConfig(updates) {
  const current = readConfig();
  const next = mergeObjects(current, updates);
  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return clone(next);
}
