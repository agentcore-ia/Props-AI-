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
