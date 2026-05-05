const https = require("https");

const N8N_BASE_URL = "https://agentcore-n8n.8zp1cp.easypanel.host";
const N8N_API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzA0NzEwYy05NTNlLTQ2MzctODM5My1iN2U5OTZiZTJiN2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjU5NGEzZDEtOTc5ZC00YzYxLTkwZDEtODdhM2YxOWViODMwIiwiaWF0IjoxNzczNzc5MDc5LCJleHAiOjE3ODE0OTYwMDB9.vBqNhO8OUtF_D5NxIOMsKbPTbKmtutcA-7z64mFzuHA";
const PROPS_AUTOMATION_SECRET = "props-automation-2026-05";
const PROPS_APP_BASE_URL = "https://app.props.com.ar";
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

function scheduleEveryMinutesNode(name, minutes, x, y) {
  return {
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-trigger`,
    name,
    type: "n8n-nodes-base.scheduleTrigger",
    typeVersion: 1.2,
    position: [x, y],
    parameters: {
      rule: {
        interval: [
          {
            field: "minutes",
            minutesInterval: minutes,
          },
        ],
      },
    },
  };
}

function scheduleDailyNode(name, hour, minute, x, y) {
  return {
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-trigger`,
    name,
    type: "n8n-nodes-base.scheduleTrigger",
    typeVersion: 1.2,
    position: [x, y],
    parameters: {
      rule: {
        interval: [
          {
            field: "cronExpression",
            expression: `${minute} ${hour} * * *`,
          },
        ],
      },
    },
  };
}

function httpNode(name, path, x, y) {
  return {
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-request`,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [x, y],
    parameters: {
      method: "POST",
      url: `${PROPS_APP_BASE_URL}${path}`,
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: "x-props-automation-secret",
            value: PROPS_AUTOMATION_SECRET,
          },
          {
            name: "Content-Type",
            value: "application/json",
          },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={}",
      options: {},
    },
  };
}

function workflowDefinition(name, triggerNode, requestNode) {
  return {
    name,
    nodes: [triggerNode, requestNode],
    connections: {
      [triggerNode.name]: {
        main: [[{ node: requestNode.name, type: "main", index: 0 }]],
      },
    },
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

  const payload = {
    name: definition.name,
    nodes: definition.nodes,
    connections: definition.connections,
    settings: definition.settings,
  };
  const updated = await apiCall("PUT", `/workflows/${existing.id}`, payload);
  console.log(`[n8n] actualizado: ${definition.name} (${existing.id})`);
  return updated;
}

async function activateWorkflow(id) {
  const workflow = await apiCall("GET", `/workflows/${id}`);
  if (workflow.active) {
    console.log(`[n8n] ya activo: ${workflow.name} (${id})`);
    return workflow;
  }

  const updated = await apiCall("POST", `/workflows/${id}/activate`, {});
  console.log(`[n8n] activado: ${workflow.name} (${id})`);
  return updated;
}

async function main() {
  const workflows = [
    workflowDefinition(
      "Props - Seguimientos automáticos",
      scheduleEveryMinutesNode("Cada 30 minutos", 30, 280, 300),
      httpNode("Ejecutar seguimientos", "/api/admin/follow-ups/run", 620, 300)
    ),
    workflowDefinition(
      "Props - Recordatorios de visitas",
      scheduleEveryMinutesNode("Cada 15 minutos", 15, 280, 300),
      httpNode("Ejecutar recordatorios", "/api/admin/visits/reminders/run", 620, 300)
    ),
    workflowDefinition(
      "Props - Ajustes diarios de alquiler",
      scheduleDailyNode("Todos los días 09:00", 9, 0, 280, 300),
      httpNode("Ejecutar ajustes", "/api/admin/rent-adjustments/run", 620, 300)
    ),
  ];

  for (const definition of workflows) {
    const workflow = await upsertWorkflow(definition);
    await activateWorkflow(workflow.id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
