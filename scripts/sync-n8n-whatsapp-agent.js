const https = require("https");
const { randomUUID } = require("crypto");

const N8N_BASE_URL = "https://agentcore-n8n.8zp1cp.easypanel.host";
const N8N_API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzA0NzEwYy05NTNlLTQ2MzctODM5My1iN2U5OTZiZTJiN2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjU5NGEzZDEtOTc5ZC00YzYxLTkwZDEtODdhM2YxOWViODMwIiwiaWF0IjoxNzczNzc5MDc5LCJleHAiOjE3ODE0OTYwMDB9.vBqNhO8OUtF_D5NxIOMsKbPTbKmtutcA-7z64mFzuHA";
const TEMPLATE_WORKFLOW_ID = "Sbf4ewHwOCdsruMv";
const WORKFLOW_NAME = "Props - Agente IA Inmobiliaria - Evolution API";
const WEBHOOK_PATH = "props-evolution-webhook";
const PROPS_AUTOMATION_SECRET = "props-automation-2026-05";
const PROPS_APP_BASE_URL = "https://app.props.com.ar";
const EVOLUTION_API_URL = "https://agentcore-evolution-api.8zp1cp.easypanel.host";
const EVOLUTION_API_KEY = "429683C4C977415CAAFCCE10F7D57E11";
const TIMEZONE = "America/Argentina/Buenos_Aires";

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/api/v1${path}`, N8N_BASE_URL);
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        method,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          "X-N8N-API-KEY": N8N_API_KEY,
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch (error) {
            return reject(
              new Error(`No se pudo parsear respuesta de n8n ${method} ${path}: ${text}`)
            );
          }

          if (res.statusCode >= 400) {
            return reject(
              new Error(
                `n8n ${method} ${path} -> ${res.statusCode}: ${JSON.stringify(parsed)}`
              )
            );
          }

          resolve(parsed);
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findNode(workflow, name) {
  const node = workflow.nodes.find((item) => item.name === name);

  if (!node) {
    throw new Error(`No se encontro el nodo plantilla ${name}.`);
  }

  const cloned = deepClone(node);
  cloned.id = randomUUID();
  return cloned;
}

function assignment(name, value, type = "string") {
  return {
    id: randomUUID(),
    name,
    value,
    type,
  };
}

function buildWorkflow(template) {
  const names = [
    "WhatsApp Trigger",
    "Filter Bot Messages",
    "Switch",
    "Get Audio",
    "Convert Audio",
    "OpenAI1",
    "Get Image",
    "Convert Image",
    "OpenAI2",
    "Edit Fields",
    "Edit Fields2",
    "Fields",
    "Log Incoming to Supabase",
    "Check AI Active",
    "Memory Manager",
    "If Clear Command",
    "WABA Confirm Clear",
    "Debounce Wait",
    "Check Is Last Message",
    "Is Last Message",
    "Get Customer DB",
    "AI Agent",
    "OpenAI Chat Model3",
    "memoria",
    "Log AI Response to Supabase",
  ];

  const nodes = names.map((name) => findNode(template, name));
  const nodeByName = Object.fromEntries(nodes.map((node) => [node.name, node]));

  nodeByName["WhatsApp Trigger"].parameters.path = WEBHOOK_PATH;
  nodeByName["WhatsApp Trigger"].webhookId = randomUUID();
  nodeByName["WhatsApp Trigger"].position = [-15000, 820];

  nodeByName["Get Audio"].parameters.url = `=${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/{{$('WhatsApp Trigger').first().json.body.instance}}`;
  nodeByName["Get Audio"].parameters.headerParameters.parameters = [
    { name: "apikey", value: EVOLUTION_API_KEY },
    { name: "Content-Type", value: "application/json" },
  ];

  nodeByName["Get Image"].parameters.url = `=${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/{{$('WhatsApp Trigger').first().json.body.instance}}`;
  nodeByName["Get Image"].parameters.headerParameters.parameters = [
    { name: "apikey", value: EVOLUTION_API_KEY },
    { name: "Content-Type", value: "application/json" },
  ];

  nodeByName["OpenAI2"].parameters.text =
    "Describe la imagen y cualquier texto visible para entender la consulta inmobiliaria del cliente.";

  nodeByName["Edit Fields"].parameters.assignments.assignments = [
    assignment(
      "text",
      "={{ $('WhatsApp Trigger').first().json.body.data.message.conversation || $('WhatsApp Trigger').first().json.body.data.message.extendedTextMessage?.text || '' }}"
    ),
  ];

  nodeByName["Edit Fields2"].parameters.assignments.assignments = [
    assignment(
      "text",
      "={{ [$json.content, $('WhatsApp Trigger').first().json.body.data.message.imageMessage?.caption].filter(Boolean).join('. ') }}"
    ),
    assignment(
      "image.caption",
      "={{ $('WhatsApp Trigger').first().json.body.data.message.imageMessage?.caption || '' }}"
    ),
  ];

  nodeByName["Fields"].parameters.assignments.assignments = [
    assignment(
      "Message_type",
      "={{ $('WhatsApp Trigger').first().json.body.data.messageType || 'text' }}"
    ),
    assignment(
      "Message_text",
      "={{ $json.text || $('WhatsApp Trigger').first().json.body.data.message.conversation || $('WhatsApp Trigger').first().json.body.data.message.extendedTextMessage?.text || '' }}"
    ),
    assignment("From", "={{ $('WhatsApp Trigger').first().json.body.data.key.remoteJid }}"),
    assignment(
      "Message_caption",
      "={{ $('WhatsApp Trigger').first().json.body.data.message.imageMessage?.caption || '' }}"
    ),
    assignment(
      "image.caption",
      "={{ $('WhatsApp Trigger').first().json.body.data.message.imageMessage?.caption || '' }}"
    ),
  ];

  nodeByName["Log Incoming to Supabase"].parameters.url = `${PROPS_APP_BASE_URL}/api/internal/whatsapp/inbound`;
  nodeByName["Log Incoming to Supabase"].parameters.headerParameters.parameters = [
    { name: "x-props-automation-secret", value: PROPS_AUTOMATION_SECRET },
    { name: "Content-Type", value: "application/json" },
  ];
  nodeByName["Log Incoming to Supabase"].parameters.jsonBody = `={{ JSON.stringify({
  instanceName: $('WhatsApp Trigger').first().json.body.instance,
  waMessageId: $('WhatsApp Trigger').first().json.body.data.key.id,
  remoteJid: $('WhatsApp Trigger').first().json.body.data.key.remoteJid,
  senderName: $('WhatsApp Trigger').first().json.body.data.pushName || 'Cliente',
  messageType: $('Fields').first().json.Message_type || 'text',
  messageText: $('Fields').first().json.Message_text || ''
}) }}`;

  nodeByName["Memory Manager"].parameters.jsCode = `const staticData = $getWorkflowStaticData('global');
const triggerPhone = $('WhatsApp Trigger').first().json.body?.data?.key?.remoteJid || '';
const now = Date.now();
const text = $('Fields').first().json?.Message_text || '';

if (typeof staticData[triggerPhone] !== 'object') {
  staticData[triggerPhone] = { v: 1, resetAt: '1970-01-01T00:00:00Z', lastMsg: now };
}

if (now - (staticData[triggerPhone].lastMsg || 0) > 4 * 60 * 60 * 1000) {
  staticData[triggerPhone].v += 1;
  staticData[triggerPhone].resetAt = new Date().toISOString();
}

let isClearCommand = false;
if (text.trim().toLowerCase() === '/clear') {
  staticData[triggerPhone].v += 1;
  staticData[triggerPhone].resetAt = new Date().toISOString();
  isClearCommand = true;
}

staticData[triggerPhone].lastMsg = now;
const currentWaId = $('WhatsApp Trigger').first().json.body?.data?.key?.id || '';
staticData[triggerPhone].lastWaId = currentWaId;

const logResult = $('Log Incoming to Supabase').first().json;
const leadId = logResult?.leadId || '';

return [{
  json: {
    memorySessionId: leadId ? 'lead-' + leadId : (triggerPhone + '_v' + staticData[triggerPhone].v),
    isClearCommand,
    text,
    currentWaId,
    phone: triggerPhone,
    leadId,
    messageText: text
  }
}];`;

  nodeByName["WABA Confirm Clear"].parameters.url = `=${EVOLUTION_API_URL}/message/sendText/{{$('WhatsApp Trigger').first().json.body.instance}}`;
  nodeByName["WABA Confirm Clear"].parameters.headerParameters.parameters = [
    { name: "apikey", value: EVOLUTION_API_KEY },
    { name: "Content-Type", value: "application/json" },
  ];
  nodeByName["WABA Confirm Clear"].parameters.sendBody = true;
  nodeByName["WABA Confirm Clear"].parameters.bodyParameters = {
    parameters: [
      {
        name: "number",
        value: "={{ $('WhatsApp Trigger').first().json.body.data.key.remoteJid }}",
      },
      {
        name: "text",
        value:
          "Listo. Borre el contexto reciente de la conversacion y podemos volver a empezar.",
      },
    ],
  };
  delete nodeByName["WABA Confirm Clear"].parameters.specifyBody;
  delete nodeByName["WABA Confirm Clear"].parameters.jsonBody;

  nodeByName["Get Customer DB"].parameters.url = `${PROPS_APP_BASE_URL}/api/internal/whatsapp/context`;
  nodeByName["Get Customer DB"].parameters.headerParameters.parameters = [
    { name: "x-props-automation-secret", value: PROPS_AUTOMATION_SECRET },
    { name: "Content-Type", value: "application/json" },
  ];
  nodeByName["Get Customer DB"].parameters.sendBody = true;
  nodeByName["Get Customer DB"].parameters.specifyBody = "json";
  nodeByName["Get Customer DB"].parameters.jsonBody = `={{ JSON.stringify({
  leadId: $('Log Incoming to Supabase').first().json.leadId,
  instanceName: $('WhatsApp Trigger').first().json.body.instance,
  remoteJid: $('WhatsApp Trigger').first().json.body.data.key.remoteJid,
  messageText: $('Check Is Last Message').first().json.combinedText || $('Fields').first().json.Message_text || ''
}) }}`;
  delete nodeByName["Get Customer DB"].parameters.bodyParameters;

  nodeByName["AI Agent"].parameters.text = "={{ $('Get Customer DB').first().json.agentInput }}";
  nodeByName["AI Agent"].parameters.options.systemMessage =
    "={{ $('Get Customer DB').first().json.systemPrompt }}";

  nodeByName["memoria"].parameters.sessionKey =
    "={{ $('Get Customer DB').first().json.memorySessionId || $('Memory Manager').first().json.memorySessionId }}";

  nodeByName["Log AI Response to Supabase"].parameters.url = `${PROPS_APP_BASE_URL}/api/internal/whatsapp/outbound`;
  nodeByName["Log AI Response to Supabase"].parameters.headerParameters.parameters = [
    { name: "x-props-automation-secret", value: PROPS_AUTOMATION_SECRET },
    { name: "Content-Type", value: "application/json" },
  ];
  nodeByName["Log AI Response to Supabase"].parameters.sendBody = true;
  nodeByName["Log AI Response to Supabase"].parameters.specifyBody = "json";
  nodeByName["Log AI Response to Supabase"].parameters.jsonBody = `={{ JSON.stringify({
  leadId: $('Log Incoming to Supabase').first().json.leadId,
  reply: $('AI Agent').first().json.output || '',
  instanceName: $('Get Customer DB').first().json.instanceName,
  number: $('Get Customer DB').first().json.targetPhone,
  selectedPropertyId: $('Get Customer DB').first().json.selectedPropertyId || '',
  selectedPropertyUrl: $('Get Customer DB').first().json.selectedPropertyUrl || ''
}) }}`;

  const connections = {
    "WhatsApp Trigger": {
      main: [[{ node: "Filter Bot Messages", type: "main", index: 0 }]],
    },
    "Filter Bot Messages": {
      main: [[{ node: "Switch", type: "main", index: 0 }]],
    },
    Switch: {
      main: [
        [{ node: "Get Audio", type: "main", index: 0 }],
        [{ node: "Get Image", type: "main", index: 0 }],
        [{ node: "Edit Fields", type: "main", index: 0 }],
      ],
    },
    "Get Audio": {
      main: [[{ node: "Convert Audio", type: "main", index: 0 }]],
    },
    "Convert Audio": {
      main: [[{ node: "OpenAI1", type: "main", index: 0 }]],
    },
    OpenAI1: {
      main: [[{ node: "Fields", type: "main", index: 0 }]],
    },
    "Get Image": {
      main: [[{ node: "Convert Image", type: "main", index: 0 }]],
    },
    "Convert Image": {
      main: [[{ node: "OpenAI2", type: "main", index: 0 }]],
    },
    OpenAI2: {
      main: [[{ node: "Edit Fields2", type: "main", index: 0 }]],
    },
    "Edit Fields2": {
      main: [[{ node: "Fields", type: "main", index: 0 }]],
    },
    "Edit Fields": {
      main: [[{ node: "Fields", type: "main", index: 0 }]],
    },
    Fields: {
      main: [[{ node: "Log Incoming to Supabase", type: "main", index: 0 }]],
    },
    "Log Incoming to Supabase": {
      main: [[{ node: "Check AI Active", type: "main", index: 0 }]],
    },
    "Check AI Active": {
      main: [
        [{ node: "Memory Manager", type: "main", index: 0 }],
        [],
      ],
    },
    "Memory Manager": {
      main: [[{ node: "If Clear Command", type: "main", index: 0 }]],
    },
    "If Clear Command": {
      main: [
        [{ node: "WABA Confirm Clear", type: "main", index: 0 }],
        [{ node: "Debounce Wait", type: "main", index: 0 }],
      ],
    },
    "Debounce Wait": {
      main: [[{ node: "Check Is Last Message", type: "main", index: 0 }]],
    },
    "Check Is Last Message": {
      main: [[{ node: "Is Last Message", type: "main", index: 0 }]],
    },
    "Is Last Message": {
      main: [[{ node: "Get Customer DB", type: "main", index: 0 }], []],
    },
    "Get Customer DB": {
      main: [[{ node: "AI Agent", type: "main", index: 0 }]],
    },
    "OpenAI Chat Model3": {
      ai_languageModel: [[{ node: "AI Agent", type: "ai_languageModel", index: 0 }]],
    },
    memoria: {
      ai_memory: [[{ node: "AI Agent", type: "ai_memory", index: 0 }]],
    },
    "AI Agent": {
      main: [[{ node: "Log AI Response to Supabase", type: "main", index: 0 }]],
    },
  };

  return {
    name: WORKFLOW_NAME,
    nodes,
    connections,
    settings: {
      executionOrder: "v1",
      timezone: TIMEZONE,
      callerPolicy: "workflowsFromSameOwner",
      availableInMCP: false,
    },
  };
}

async function getWorkflowByName(name) {
  const result = await apiCall("GET", "/workflows?limit=100");
  return (result.data || []).find((workflow) => workflow.name === name) || null;
}

async function upsertWorkflow(definition) {
  const existing = await getWorkflowByName(definition.name);

  if (!existing) {
    const created = await apiCall("POST", "/workflows", definition);
    console.log(`[n8n] creado: ${definition.name} (${created.id})`);
    return created;
  }

  const updated = await apiCall("PUT", `/workflows/${existing.id}`, {
    name: definition.name,
    nodes: definition.nodes,
    connections: definition.connections,
    settings: definition.settings,
  });
  console.log(`[n8n] actualizado: ${definition.name} (${existing.id})`);
  return { ...updated, id: existing.id };
}

async function activateWorkflow(id) {
  const workflow = await apiCall("GET", `/workflows/${id}`);

  if (workflow.active) {
    console.log(`[n8n] ya activo: ${workflow.name} (${id})`);
    return workflow;
  }

  await apiCall("POST", `/workflows/${id}/activate`, {});
  console.log(`[n8n] activado: ${workflow.name} (${id})`);
  return workflow;
}

async function main() {
  const template = await apiCall("GET", `/workflows/${TEMPLATE_WORKFLOW_ID}`);
  const definition = buildWorkflow(template);
  const workflow = await upsertWorkflow(definition);
  await activateWorkflow(workflow.id);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
