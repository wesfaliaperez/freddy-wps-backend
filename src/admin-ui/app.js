import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import htm from "https://esm.sh/htm@3/react";

const html = htm.bind(React.createElement);

const emptyCourse = () => ({
  name: "",
  summary: "",
  keywords: [],
  price: "RD$3,500",
  duration: "4 a 6 semanas",
  modality: "Online (en vivo o pregrabado)",
  enrollmentLink: "",
  active: true
});

const emptyForm = () => ({
  label: "",
  url: "",
  course: ""
});

function normalizeForms(forms) {
  return (forms || []).map((form) =>
    typeof form === "string"
      ? { label: "Formulario general", url: form, course: "" }
      : {
          label: form.label || "",
          url: form.url || "",
          course: form.course || ""
        }
  );
}

function denormalizeForms(forms) {
  return forms
    .filter((form) => form.url.trim())
    .map((form) => ({
      label: form.label.trim() || "Formulario",
      url: form.url.trim(),
      course: form.course.trim()
    }));
}

function parseLines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function linesFromArray(items) {
  return (items || []).join("\n");
}

function Dashboard() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState({ kind: "info", text: "Cargando configuracion..." });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/admin/api/config")
      .then((response) => response.json())
      .then((data) => {
        setConfig({
          ...data,
          forms: normalizeForms(data.forms),
          courses: (data.courses || []).map((course) => ({
            ...emptyCourse(),
            ...course,
            keywords: course.keywords || []
          }))
        });
        setStatus({ kind: "success", text: "Configuracion cargada correctamente." });
      })
      .catch(() => {
        setStatus({ kind: "error", text: "No se pudo cargar la configuracion." });
      });
  }, []);

  const activeCourses = useMemo(
    () => (config?.courses || []).filter((course) => course.active !== false).length,
    [config]
  );

  if (!config) {
    return html`
      <div className="loading-state">
        <div className="loading-card">
          <div className="hero-eyebrow">Freddy Studio</div>
          <h1 className="hero-title">Cargando panel</h1>
          <p className="hero-copy">Estamos preparando la configuracion comercial del agente para que puedas editarla con calma.</p>
        </div>
      </div>
    `;
  }

  function updateSection(section, key, value) {
    setConfig((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value
      }
    }));
  }

  function updateRoot(key, value) {
    setConfig((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateCourse(index, key, value) {
    setConfig((current) => {
      const courses = [...current.courses];
      courses[index] = {
        ...courses[index],
        [key]: value
      };
      return { ...current, courses };
    });
  }

  function addCourse() {
    setConfig((current) => ({
      ...current,
      courses: [...current.courses, emptyCourse()]
    }));
  }

  function removeCourse(index) {
    setConfig((current) => ({
      ...current,
      courses: current.courses.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function updateForm(index, key, value) {
    setConfig((current) => {
      const forms = [...current.forms];
      forms[index] = {
        ...forms[index],
        [key]: value
      };
      return { ...current, forms };
    });
  }

  function addForm() {
    setConfig((current) => ({
      ...current,
      forms: [...current.forms, emptyForm()]
    }));
  }

  function removeForm(index) {
    setConfig((current) => ({
      ...current,
      forms: current.forms.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  async function saveConfig() {
    setSaving(true);
    setStatus({ kind: "info", text: "Guardando cambios..." });

    const payload = {
      ...config,
      commercial: {
        ...config.commercial,
        includes: parseLines(config.commercial.includesText || "")
      },
      tone: {
        ...config.tone,
        writingRules: parseLines(config.tone.writingRulesText || "")
      },
      courses: config.courses.map((course) => ({
        ...course,
        keywords: parseLines(course.keywordsText || "")
      })),
      forms: denormalizeForms(config.forms)
    };

    delete payload.commercial.includesText;
    delete payload.tone.writingRulesText;
    payload.courses = payload.courses.map((course) => {
      const next = { ...course };
      delete next.keywordsText;
      return next;
    });

    try {
      const response = await fetch("/admin/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "No se pudo guardar.");
      }

      setConfig({
        ...data.config,
        commercial: {
          ...data.config.commercial,
          includesText: linesFromArray(data.config.commercial.includes)
        },
        tone: {
          ...data.config.tone,
          writingRulesText: linesFromArray(data.config.tone.writingRules)
        },
        forms: normalizeForms(data.config.forms),
        courses: (data.config.courses || []).map((course) => ({
          ...emptyCourse(),
          ...course,
          keywords: course.keywords || [],
          keywordsText: linesFromArray(course.keywords || [])
        }))
      });
      setStatus({ kind: "success", text: "Cambios guardados correctamente." });
    } catch (error) {
      setStatus({ kind: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (!config.commercial.includesText) {
    config.commercial.includesText = linesFromArray(config.commercial.includes);
  }

  if (!config.tone.writingRulesText) {
    config.tone.writingRulesText = linesFromArray(config.tone.writingRules);
  }

  config.courses = config.courses.map((course) => ({
    ...course,
    keywordsText:
      course.keywordsText === undefined ? linesFromArray(course.keywords) : course.keywordsText
  }));

  return html`
    <div className="studio-shell">
      <header className="studio-header">
        <section className="hero-card">
          <div className="hero-eyebrow">Freddy Studio</div>
          <h1 className="hero-title">Controla la voz, la oferta y la inteligencia comercial de Freddy.</h1>
          <p className="hero-copy">
            Edita cursos, precios, links, tono y respuestas clave desde una interfaz pensada para negocio. Freddy sigue usando OpenAI, pero ahora con una base mucho más clara y personalizable.
          </p>
          <div className="hero-meta">
            <span className="chip">Sitio oficial: ${config.business.websiteLink}</span>
            <span className="chip">${activeCourses} cursos activos</span>
            <span className="chip">Precio base: ${config.commercial.defaultPrice}</span>
          </div>
        </section>
        <aside className="side-card">
          <h2>Panel comercial</h2>
          <ul className="side-list">
            <li>Freddy toma el sitio oficial correcto de WPS con una sola G.</li>
            <li>Puedes definir un formulario por curso o dejar formularios generales.</li>
            <li>Las respuestas del agente siguen usando IA, pero con reglas y contexto editables.</li>
            <li>No hace falta tocar JSON técnico para manejar cursos y formularios.</li>
          </ul>
        </aside>
      </header>

      <div className="dashboard-grid">
        <aside className="sidebar-stack">
          <div className="panel-card">
            <h3 className="panel-title">Estado</h3>
            <p className="panel-copy">Todo lo que cambies aquí alimenta la base comercial que Freddy usa antes de responder.</p>
            <div className=${`status-badge ${status.kind}`}>${status.text}</div>
          </div>
          <div className="panel-card">
            <h3 className="panel-title">Acceso</h3>
            <p className="panel-copy">Este panel está protegido con usuario y contraseña del servidor. Cambia esas credenciales en tu archivo <code>.env</code> cuando quieras.</p>
          </div>
        </aside>

        <main className="main-stack">
          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Identidad del negocio</h3>
                <p>Lo esencial que Freddy usa para presentarse, escalar y compartir links.</p>
              </div>
            </div>
            <div className="two-col">
              <div className="field">
                <label>Nombre del agente</label>
                <input value=${config.business.assistantName} onInput=${(event) => updateSection("business", "assistantName", event.target.value)} />
              </div>
              <div className="field">
                <label>Empresa</label>
                <input value=${config.business.companyName} onInput=${(event) => updateSection("business", "companyName", event.target.value)} />
              </div>
              <div className="field full">
                <label>Sitio web oficial</label>
                <input value=${config.business.websiteLink} onInput=${(event) => updateSection("business", "websiteLink", event.target.value)} />
              </div>
              <div className="field">
                <label>Link de pago</label>
                <input value=${config.business.paymentLink} onInput=${(event) => updateSection("business", "paymentLink", event.target.value)} />
              </div>
              <div className="field">
                <label>Canal de recuperacion</label>
                <input value=${config.business.recoveryChannelLink} onInput=${(event) => updateSection("business", "recoveryChannelLink", event.target.value)} />
              </div>
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Base comercial</h3>
                <p>Estos valores se usan como respaldo cuando un curso no tiene detalle propio.</p>
              </div>
            </div>
            <div className="two-col">
              <div className="field">
                <label>Precio base</label>
                <input value=${config.commercial.defaultPrice} onInput=${(event) => updateSection("commercial", "defaultPrice", event.target.value)} />
              </div>
              <div className="field">
                <label>Duracion base</label>
                <input value=${config.commercial.defaultDuration} onInput=${(event) => updateSection("commercial", "defaultDuration", event.target.value)} />
              </div>
              <div className="field full">
                <label>Modalidad base</label>
                <input value=${config.commercial.defaultModality} onInput=${(event) => updateSection("commercial", "defaultModality", event.target.value)} />
              </div>
              <div className="field full">
                <label>Incluye (una linea por item)</label>
                <textarea value=${config.commercial.includesText} onInput=${(event) => updateSection("commercial", "includesText", event.target.value)} />
              </div>
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Tono e IA</h3>
                <p>Esto guía a Freddy cuando genera respuestas con OpenAI.</p>
              </div>
            </div>
            <div className="two-col">
              <div className="field">
                <label>Descripcion del tono</label>
                <input value=${config.tone.style} onInput=${(event) => updateSection("tone", "style", event.target.value)} />
              </div>
              <div className="field full">
                <label>Reglas de escritura (una linea por regla)</label>
                <textarea value=${config.tone.writingRulesText} onInput=${(event) => updateSection("tone", "writingRulesText", event.target.value)} />
              </div>
              <div className="field full">
                <label>Instrucciones extra para la IA</label>
                <textarea value=${config.tone.customInstructions || ""} onInput=${(event) => updateSection("tone", "customInstructions", event.target.value)} />
              </div>
              <div className="field full">
                <label>Mensaje de bienvenida</label>
                <textarea value=${config.welcomeMessage} onInput=${(event) => updateRoot("welcomeMessage", event.target.value)} />
              </div>
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Cursos disponibles</h3>
                <p>Define cada curso con su resumen, keywords, precio, modalidad y link de inscripcion propio.</p>
              </div>
              <div className="toolbar">
                <button className="button" type="button" onClick=${addCourse}>Agregar curso</button>
              </div>
            </div>

            <div className="cards-grid">
              ${config.courses.map((course, index) => html`
                <article className="course-card" key=${index}>
                  <div className="course-card-header">
                    <span className="card-badge">Curso ${index + 1}</span>
                    <button className="danger-button" type="button" onClick=${() => removeCourse(index)}>Eliminar</button>
                  </div>
                  <div className="field">
                    <label>Nombre</label>
                    <input value=${course.name} onInput=${(event) => updateCourse(index, "name", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Resumen comercial</label>
                    <textarea value=${course.summary} onInput=${(event) => updateCourse(index, "summary", event.target.value)} />
                  </div>
                  <div className="split-fields">
                    <div className="field">
                      <label>Precio</label>
                      <input value=${course.price} onInput=${(event) => updateCourse(index, "price", event.target.value)} />
                    </div>
                    <div className="field">
                      <label>Duracion</label>
                      <input value=${course.duration} onInput=${(event) => updateCourse(index, "duration", event.target.value)} />
                    </div>
                    <div className="field">
                      <label>Modalidad</label>
                      <input value=${course.modality} onInput=${(event) => updateCourse(index, "modality", event.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Keywords para reconocer el curso (una por linea)</label>
                    <textarea value=${course.keywordsText} onInput=${(event) => updateCourse(index, "keywordsText", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Link de inscripcion del curso</label>
                    <input value=${course.enrollmentLink || ""} onInput=${(event) => updateCourse(index, "enrollmentLink", event.target.value)} />
                  </div>
                  <label className="inline-checkbox">
                    <input
                      type="checkbox"
                      checked=${course.active !== false}
                      onChange=${(event) => updateCourse(index, "active", event.target.checked)}
                    />
                    Curso activo
                  </label>
                </article>
              `)}
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Formularios generales</h3>
                <p>Usa esta lista como respaldo. Freddy enviará un solo enlace a la vez, no todos juntos.</p>
              </div>
              <div className="toolbar">
                <button className="ghost-button" type="button" onClick=${addForm}>Agregar formulario</button>
              </div>
            </div>

            <div className="cards-grid">
              ${config.forms.map((form, index) => html`
                <article className="form-card" key=${index}>
                  <div className="form-card-header">
                    <span className="card-badge">Formulario ${index + 1}</span>
                    <button className="danger-button" type="button" onClick=${() => removeForm(index)}>Eliminar</button>
                  </div>
                  <div className="field">
                    <label>Etiqueta</label>
                    <input value=${form.label} onInput=${(event) => updateForm(index, "label", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>URL</label>
                    <input value=${form.url} onInput=${(event) => updateForm(index, "url", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Curso asociado (opcional)</label>
                    <input value=${form.course} onInput=${(event) => updateForm(index, "course", event.target.value)} />
                  </div>
                </article>
              `)}
            </div>
          </section>

          <section className="section-card">
            <div className="section-header">
              <div>
                <h3>Respuestas base</h3>
                <p>Esto sirve como guía para la IA y como respaldo si OpenAI falla.</p>
              </div>
            </div>
            <div className="two-col">
              <div className="field">
                <label>Objecion por dinero</label>
                <textarea value=${config.responses.budgetObjection} onInput=${(event) => updateSection("responses", "budgetObjection", event.target.value)} />
              </div>
              <div className="field">
                <label>Objecion por tiempo</label>
                <textarea value=${config.responses.timingObjection} onInput=${(event) => updateSection("responses", "timingObjection", event.target.value)} />
              </div>
              <div className="field">
                <label>Indecision</label>
                <textarea value=${config.responses.hesitation} onInput=${(event) => updateSection("responses", "hesitation", event.target.value)} />
              </div>
              <div className="field">
                <label>Recuperacion de lead</label>
                <textarea value=${config.responses.leadRecovery} onInput=${(event) => updateSection("responses", "leadRecovery", event.target.value)} />
              </div>
              <div className="field full">
                <label>Mensaje de escalamiento</label>
                <textarea value=${config.responses.escalation} onInput=${(event) => updateSection("responses", "escalation", event.target.value)} />
              </div>
            </div>
          </section>

          <div className="sticky-actions">
            <div className="save-meta">
              <strong>Listo para guardar</strong>
              <span>Los cambios actualizan la base comercial del agente, los cursos y la personalidad de Freddy.</span>
            </div>
            <div className="toolbar">
              <button className="button" type="button" disabled=${saving} onClick=${saveConfig}>
                ${saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;
}

createRoot(document.getElementById("root")).render(html`<${Dashboard} />`);
