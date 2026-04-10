import { env } from "../config/env.js";
import { getBotConfig, updateBotConfig } from "../services/botConfigStore.js";

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAdminPage(config) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Freddy Admin</title>
    <style>
      :root {
        --bg: #f2ecdf;
        --panel: #fffaf1;
        --line: #d7ccb8;
        --ink: #22201b;
        --muted: #645d52;
        --brand: #125f52;
        --brand-strong: #0c4037;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--ink);
        font-family: Georgia, serif;
        background:
          radial-gradient(circle at top right, rgba(214, 180, 129, 0.25), transparent 28%),
          linear-gradient(180deg, #f4ecdf 0%, #efe5d7 100%);
      }
      .wrap { max-width: 1120px; margin: 0 auto; padding: 28px 18px 56px; }
      .hero, .card { background: rgba(255, 250, 241, 0.92); border: 1px solid var(--line); }
      .hero { padding: 24px; margin-bottom: 20px; }
      .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
      .card { padding: 18px; }
      h1, h2 { margin: 0 0 12px; }
      p { margin: 0; color: var(--muted); }
      form { display: grid; gap: 18px; }
      label { display: block; margin-bottom: 8px; font-size: 14px; color: var(--muted); }
      input, textarea {
        width: 100%; padding: 12px; border: 1px solid var(--line);
        background: #fff; color: var(--ink); font: inherit;
      }
      textarea { resize: vertical; min-height: 160px; }
      button {
        border: 0; background: var(--brand); color: white; padding: 14px 18px;
        cursor: pointer; font: inherit;
      }
      button:hover { background: var(--brand-strong); }
      .status { padding: 12px 14px; border: 1px solid var(--line); background: white; color: var(--muted); }
      .actions { display: flex; gap: 12px; align-items: center; }
      .full { grid-column: 1 / -1; }
      .note { font-size: 13px; color: var(--muted); }
      .pill {
        display: inline-block; margin-top: 10px; padding: 6px 10px; border: 1px solid var(--line);
        background: #fff; color: var(--brand-strong); font-size: 12px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero">
        <h1>Freddy Admin</h1>
        <p>Edita links, cursos, precios, tono y respuestas comerciales desde el navegador.</p>
        <div class="pill">Sitio oficial actual: ${escapeHtml(config.business.websiteLink)}</div>
      </section>
      <form id="admin-form">
        <div class="grid">
          <section class="card">
            <h2>Negocio</h2>
            <label>Nombre del asistente</label>
            <input name="assistantName" value="${escapeHtml(config.business.assistantName)}" />
            <label>Empresa</label>
            <input name="companyName" value="${escapeHtml(config.business.companyName)}" />
            <label>Sitio web oficial</label>
            <input name="websiteLink" value="${escapeHtml(config.business.websiteLink)}" />
            <label>Link de pago</label>
            <input name="paymentLink" value="${escapeHtml(config.business.paymentLink)}" />
            <label>Canal de recuperacion</label>
            <input name="recoveryChannelLink" value="${escapeHtml(config.business.recoveryChannelLink)}" />
          </section>
          <section class="card">
            <h2>Oferta</h2>
            <label>Precio base</label>
            <input name="defaultPrice" value="${escapeHtml(config.commercial.defaultPrice)}" />
            <label>Duracion base</label>
            <input name="defaultDuration" value="${escapeHtml(config.commercial.defaultDuration)}" />
            <label>Modalidad base</label>
            <input name="defaultModality" value="${escapeHtml(config.commercial.defaultModality)}" />
            <label>Incluye (JSON array)</label>
            <textarea name="includes">${escapeHtml(JSON.stringify(config.commercial.includes, null, 2))}</textarea>
          </section>
          <section class="card">
            <h2>Tono</h2>
            <label>Descripcion del tono</label>
            <input name="toneStyle" value="${escapeHtml(config.tone.style)}" />
            <label>Reglas de escritura (JSON array)</label>
            <textarea name="writingRules">${escapeHtml(JSON.stringify(config.tone.writingRules, null, 2))}</textarea>
            <label>Instrucciones extra del tono</label>
            <textarea name="customInstructions">${escapeHtml(config.tone.customInstructions || "")}</textarea>
            <label>Mensaje de bienvenida</label>
            <textarea name="welcomeMessage">${escapeHtml(config.welcomeMessage)}</textarea>
          </section>
          <section class="card">
            <h2>Respuestas base</h2>
            <label>Objecion por dinero</label>
            <textarea name="budgetObjection">${escapeHtml(config.responses.budgetObjection)}</textarea>
            <label>Objecion por tiempo</label>
            <textarea name="timingObjection">${escapeHtml(config.responses.timingObjection)}</textarea>
            <label>Indecision</label>
            <textarea name="hesitation">${escapeHtml(config.responses.hesitation)}</textarea>
            <label>Recuperacion de lead</label>
            <textarea name="leadRecovery">${escapeHtml(config.responses.leadRecovery)}</textarea>
            <label>Escalamiento</label>
            <textarea name="escalation">${escapeHtml(config.responses.escalation)}</textarea>
          </section>
          <section class="card full">
            <h2>Cursos</h2>
            <label>Cursos disponibles (JSON array)</label>
            <textarea name="courses">${escapeHtml(JSON.stringify(config.courses, null, 2))}</textarea>
            <p class="note">Formato sugerido: [{"name":"Excel Avanzado","summary":"Ideal para oficina y analisis basico."}]</p>
          </section>
          <section class="card full">
            <h2>Formularios</h2>
            <label>Links de formularios (JSON array)</label>
            <textarea name="forms">${escapeHtml(JSON.stringify(config.forms, null, 2))}</textarea>
          </section>
        </div>
        <div class="actions">
          <button type="submit">Guardar cambios</button>
          <div id="status" class="status">Sin cambios recientes.</div>
        </div>
      </form>
    </div>
    <script>
      const form = document.getElementById("admin-form");
      const status = document.getElementById("status");
      function parseJson(value, label) {
        try { return JSON.parse(value); }
        catch (error) { throw new Error("El campo " + label + " debe tener JSON valido."); }
      }
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          const payload = {
            business: {
              assistantName: form.assistantName.value.trim(),
              companyName: form.companyName.value.trim(),
              websiteLink: form.websiteLink.value.trim(),
              paymentLink: form.paymentLink.value.trim(),
              recoveryChannelLink: form.recoveryChannelLink.value.trim()
            },
            commercial: {
              defaultPrice: form.defaultPrice.value.trim(),
              defaultDuration: form.defaultDuration.value.trim(),
              defaultModality: form.defaultModality.value.trim(),
              includes: parseJson(form.includes.value, "Incluye")
            },
              tone: {
                style: form.toneStyle.value.trim(),
                writingRules: parseJson(form.writingRules.value, "Reglas de escritura"),
                customInstructions: form.customInstructions.value.trim()
              },
            welcomeMessage: form.welcomeMessage.value,
            courses: parseJson(form.courses.value, "Cursos"),
            forms: parseJson(form.forms.value, "Formularios"),
            responses: {
              budgetObjection: form.budgetObjection.value,
              timingObjection: form.timingObjection.value,
              hesitation: form.hesitation.value,
              leadRecovery: form.leadRecovery.value,
              escalation: form.escalation.value
            }
          };
          const response = await fetch("/admin/api/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || "No se pudo guardar.");
          status.textContent = "Cambios guardados correctamente.";
        } catch (error) {
          status.textContent = error.message;
        }
      });
    </script>
  </body>
</html>`;
}

export function renderAdminPage(_req, res) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(buildAdminPage(getBotConfig()));
}

export function getAdminConfig(_req, res) {
  res.status(200).json(getBotConfig());
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
