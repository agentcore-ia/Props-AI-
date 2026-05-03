# Props AI

Base escalable para un CRM inmobiliario SaaS llamado `Props`, pensado para evolucionar desde mock data hacia backend real, IA y canales conversacionales.

## Stack

- Next.js 14 con App Router
- Tailwind CSS
- shadcn/ui
- TypeScript
- Recharts

## Módulos incluidos

- Dashboard con métricas, actividad reciente y gráfico
- Propiedades con cards y modal de alta
- Leads con vista tabla y kanban
- Mensajes con inbox estilo chat
- IA con interfaz tipo copiloto
- Llamadas con timeline operativo
- Configuración de la inmobiliaria

## Estructura

```text
src/
  app/
    (crm)/
      dashboard/
      propiedades/
      leads/
      mensajes/
      ia/
      llamadas/
      configuracion/
  components/
    ui/
    layout/
    dashboard/
    props/
    leads/
    messages/
    ia/
  lib/
    mock-data/
    utils.ts
```

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy

El proyecto incluye `Dockerfile` para despliegue directo en Easypanel.

Variables utiles:

```bash
NODE_ENV=production
PORT=3000
```

## Supabase Auth

La app ya viene preparada para login con Supabase en el dashboard (`app.props.com.ar`).

Variables requeridas:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4
```

Checklist del proyecto Supabase:

1. Crear un proyecto nuevo.
2. En `Authentication > Sign In / Providers`, dejar activo `Email`.
3. En `Authentication > URL Configuration`:
   - Site URL: `https://app.props.com.ar`
   - Redirect URLs:
     - `https://app.props.com.ar/auth/login`
     - `http://localhost:3000/auth/login`
4. En `SQL Editor`, ejecutar [supabase/setup.sql](./supabase/setup.sql).
5. Copiar la `secret key` del proyecto en `Settings > API Keys` y cargarla como `SUPABASE_SECRET_KEY` en el deploy.
6. Crear el primer usuario desde `Authentication > Users` o usar el bootstrap admin ya provisionado.

## Catalogo publico + IA

El catalogo publico ahora incluye:

- buscador responsive
- filtros de venta / alquiler
- formulario real de consultas
- asistente IA conectado por `Responses API`

Para habilitar OpenAI real en produccion, cargar:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4
```

Referencia oficial usada para la integracion:

- [Responses API](https://platform.openai.com/docs/api-reference/responses/compact?api-mode=responses)
- [Quickstart JavaScript](https://platform.openai.com/docs/quickstart?api-mode=chat&lang=curl)

El middleware protege el dashboard y redirige a `/auth/login` cuando no hay sesión.

## Validación

```bash
npm run lint
npm run build
```

## Próximos pasos sugeridos

1. Conectar autenticación y roles.
2. Sustituir mocks por servicios/API.
3. Persistir estado de mensajes, leads y propiedades.
4. Integrar WhatsApp, automatizaciones e IA real.
