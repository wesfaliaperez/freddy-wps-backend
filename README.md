# Freddy Backend

Backend de Freddy, el asistente comercial y de atencion al cliente de WPS Consulting Group, listo para integrarse con WhatsApp Cloud API de Meta y OpenAI.

## Stack

- Node.js + Express
- OpenAI API
- Webhook de WhatsApp (Meta)
- Arquitectura preparada para multiples canales

## Funcionalidades

- Webhook `GET /webhook` para verificacion de Meta
- Webhook `POST /webhook` para recibir mensajes entrantes
- Panel `GET /admin` para editar cursos, precios, links, tono y respuestas base
- Respuestas naturales generadas con OpenAI usando el prompt de Freddy
- Historial por usuario con tope de 20 mensajes
- Clasificacion de leads: `consulta`, `interesado`, `caliente`, `pago_realizado`
- Deteccion de intencion y logica conversacional
- Envio contextual de formularios, sitio web y enlace de pago
- Escalamiento por email o por log estructurado
- Respuesta de bienvenida y recuperacion de leads no convertidos
- Estructura modular lista para crecer a otros canales

## Requisitos

- Node.js 18.18+ o superior
- Cuenta de Meta WhatsApp Cloud API
- API key de OpenAI

## Instalacion

```bash
npm install
cp .env.example .env
```

Completa las variables del archivo `.env`.

## Variables importantes

- `OPENAI_API_KEY`: API key de OpenAI
- `OPENAI_MODEL`: modelo para generar respuestas de Freddy
- `ADMIN_USERNAME` y `ADMIN_PASSWORD`: acceso al panel de administracion
- `WHATSAPP_VERIFY_TOKEN`: token para verificar el webhook en Meta
- `WHATSAPP_ACCESS_TOKEN`: token del numero de WhatsApp
- `WHATSAPP_PHONE_NUMBER_ID`: Phone Number ID de Meta
- `WPS_ESCALATION_EMAIL`: correo para alertas comerciales
- `WPS_ESCALATION_WHATSAPP_NUMBER`: numero interno para escalar oportunidades
- `SMTP_*`: configuracion opcional para envio real de emails
- `ALERT_LOG_ONLY=true`: si no quieres enviar email y prefieres solo logs

## Ejecutar en local

```bash
npm run dev
```

Servidor local:

- `GET /health`
- `GET /webhook`
- `POST /webhook`

## Configurar ngrok

1. Inicia el servidor local:

```bash
npm run dev
```

2. Expone el puerto:

```bash
ngrok http 3000
```

3. Copia la URL HTTPS generada por ngrok, por ejemplo:

```text
https://abc123.ngrok-free.app
```

4. En Meta Developer configura el webhook con:

- Callback URL: `https://abc123.ngrok-free.app/webhook`
- Verify token: el mismo valor de `WHATSAPP_VERIFY_TOKEN`

## Flujo conversacional de Freddy

Freddy combina reglas comerciales con generacion natural:

1. Analiza el mensaje entrante
2. Detecta intencion y clasificacion del lead
3. Decide si debe:
   - responder informacion
   - sugerir un curso
   - compartir formulario
   - compartir web pregrabada
   - compartir link de pago
   - escalar a una asesora
4. Genera una respuesta natural con OpenAI
5. Guarda historial y estado del contacto

## Notas de produccion

- El repositorio de conversaciones actual usa almacenamiento en memoria para un arranque rapido.
- La capa `conversationStore` esta separada para reemplazarla facilmente por Redis, Postgres o MongoDB en produccion.
- El backend ignora eventos de estado de WhatsApp y procesa solo mensajes entrantes.
- Se limita el historial a 20 mensajes por usuario para controlar contexto y costo.

## Deploy en Railway

1. Sube este proyecto a GitHub.
2. Crea un nuevo proyecto en Railway desde el repositorio.
3. Configura las variables de entorno del `.env.example`.
4. Railway detectara `package.json` y ejecutara:

```bash
npm install
npm start
```

5. Configura en Meta la URL publica de Railway:

```text
https://tu-app.railway.app/webhook
```

## Endpoints

### `GET /`

Estado base del servicio y endpoints disponibles.

### `GET /health`

Estado del servicio.

### `GET /admin`

Panel protegido para editar la configuracion comercial del bot.

### `GET /admin/api/config`

Devuelve la configuracion editable actual del bot.

### `PUT /admin/api/config`

Guarda cambios desde el panel administrativo.

## Panel administrativo

Abre:

```text
/admin
```

Desde ahi puedes actualizar sin tocar codigo:

- cursos activos
- precios y duracion
- sitio oficial y links de pago
- mensaje de bienvenida
- respuestas base
- tono e instrucciones comerciales

### `GET /webhook`

Verifica el webhook de Meta.

### `POST /webhook`

Recibe mensajes de WhatsApp y responde automaticamente.

## Referencia OpenAI

La integracion del SDK esta basada en el cliente oficial de Node.js y el endpoint `responses.create` de OpenAI:

- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses?lang=node.js)
