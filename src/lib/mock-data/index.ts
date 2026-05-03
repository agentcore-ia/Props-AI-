export type Metric = {
  label: string;
  value: string;
  delta: string;
  hint: string;
};

export type Agency = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  ownerName: string;
  ownerEmail: string;
  plan: "Starter" | "Growth" | "Scale";
  status: "Activa" | "En onboarding";
  city: string;
  tagline: string;
};

export type Property = {
  id: string;
  tenantSlug: string;
  title: string;
  price: number;
  location: string;
  status: "Disponible" | "Reservada" | "Vendida" | "Alquilada";
  operation: "Venta" | "Alquiler";
  description: string;
  image: string;
  images: string[];
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "Nuevo" | "Visitando" | "Propuesta" | "Cerrado";
  interest: string;
};

export type Conversation = {
  id: string;
  name: string;
  channel: "WhatsApp" | "Instagram" | "Web";
  unread: number;
  lastMessage: string;
  messages: Array<{
    id: string;
    role: "client" | "agent";
    content: string;
    time: string;
  }>;
};

export type CallLog = {
  id: string;
  contact: string;
  status: "Pendiente" | "Completada" | "Perdida";
  summary: string;
  when: string;
};

export type AIMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export const agencies: Agency[] = [
  {
    id: "agency-1",
    name: "Gentile Propiedades",
    slug: "gentile",
    email: "hola@gentile.com.ar",
    phone: "+54 11 5555 1001",
    ownerName: "Marina Gentile",
    ownerEmail: "marina@gentile.com.ar",
    plan: "Growth",
    status: "Activa",
    city: "CABA",
    tagline: "Propiedades seleccionadas en Buenos Aires.",
  },
  {
    id: "agency-2",
    name: "Rodriguez Real Estate",
    slug: "rodriguez",
    email: "equipo@rodriguezre.com",
    phone: "+54 11 5555 1002",
    ownerName: "Tomas Rodriguez",
    ownerEmail: "tomas@rodriguezre.com",
    plan: "Scale",
    status: "Activa",
    city: "Zona Norte",
    tagline: "Casas y departamentos para vivir o invertir.",
  },
  {
    id: "agency-3",
    name: "Delta Brokers",
    slug: "delta",
    email: "contacto@deltabrokers.com",
    phone: "+54 11 5555 1003",
    ownerName: "Rocio Vidal",
    ownerEmail: "rocio@deltabrokers.com",
    plan: "Starter",
    status: "En onboarding",
    city: "Nordelta",
    tagline: "Especialistas en barrios privados y lagos.",
  },
];

export const metrics: Metric[] = [
  { label: "Propiedades activas", value: "128", delta: "+12%", hint: "portafolio publicado" },
  { label: "Leads nuevos", value: "46", delta: "+8%", hint: "ultimas 24 horas" },
  { label: "Mensajes sin responder", value: "19", delta: "-14%", hint: "baja de backlog" },
  { label: "Conversiones", value: "7.2%", delta: "+1.1%", hint: "embudo comercial" },
];

export const pipelineData = [
  { name: "Lun", leads: 12, cierres: 2 },
  { name: "Mar", leads: 18, cierres: 4 },
  { name: "Mie", leads: 15, cierres: 3 },
  { name: "Jue", leads: 24, cierres: 5 },
  { name: "Vie", leads: 19, cierres: 4 },
  { name: "Sab", leads: 14, cierres: 2 },
];

export const recentActivity = [
  "Gentile publico un nuevo departamento premium en Belgrano.",
  "Rodriguez recibio una consulta web y disparo una automatizacion.",
  "Delta completo el onboarding y preparo su catalogo publico.",
  "Un lead cambio de estado a Propuesta luego de una visita.",
];

export const properties: Property[] = [
  {
    id: "prop-1",
    tenantSlug: "gentile",
    title: "Torre Libertad 4B",
    price: 285000,
    location: "Belgrano, CABA",
    status: "Disponible",
    operation: "Venta",
    description: "Semipiso con balcon corrido, amenities premium y cochera.",
    image: "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "prop-2",
    tenantSlug: "gentile",
    title: "PH Arce Patio",
    price: 198000,
    location: "Palermo Hollywood, CABA",
    status: "Reservada",
    operation: "Venta",
    description: "PH reciclado con patio interno, ideal renta temporal.",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "prop-3",
    tenantSlug: "rodriguez",
    title: "Casa Laguna Norte",
    price: 520000,
    location: "Nordelta, Buenos Aires",
    status: "Vendida",
    operation: "Venta",
    description: "Casa de 4 suites con jardin al lago y galeria techada.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "prop-4",
    tenantSlug: "rodriguez",
    title: "Loft Recoleta Park",
    price: 2200,
    location: "Recoleta, CABA",
    status: "Disponible",
    operation: "Alquiler",
    description: "Loft amoblado de diseno con amenities y seguridad 24h.",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "prop-5",
    tenantSlug: "delta",
    title: "Townhouse Delta Vista",
    price: 310000,
    location: "Tigre, Buenos Aires",
    status: "Disponible",
    operation: "Venta",
    description: "Townhouse nuevo con jardin, parrilla y muelle compartido.",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566752227-8f3b29b7fdb5?auto=format&fit=crop&w=1200&q=80",
    ],
  },
];

export const leads: Lead[] = [
  {
    id: "lead-1",
    name: "Paula Gomez",
    phone: "+54 11 5555 1101",
    email: "paula@cliente.com",
    status: "Visitando",
    interest: "Torre Libertad 4B",
  },
  {
    id: "lead-2",
    name: "Franco Medina",
    phone: "+54 11 5555 2202",
    email: "franco@cliente.com",
    status: "Nuevo",
    interest: "PH Arce Patio",
  },
  {
    id: "lead-3",
    name: "Lucia Alvarez",
    phone: "+54 11 5555 3303",
    email: "lucia@cliente.com",
    status: "Propuesta",
    interest: "Casa Laguna Norte",
  },
  {
    id: "lead-4",
    name: "Bruno Rey",
    phone: "+54 11 5555 4404",
    email: "bruno@cliente.com",
    status: "Cerrado",
    interest: "Loft Recoleta Park",
  },
];

export const conversations: Conversation[] = [
  {
    id: "conv-1",
    name: "Paula Gomez",
    channel: "WhatsApp",
    unread: 2,
    lastMessage: "Podemos visitar el depto manana por la tarde?",
    messages: [
      { id: "m1", role: "client", content: "Hola, vi la publicacion del depto en Belgrano.", time: "09:12" },
      { id: "m2", role: "agent", content: "Claro, te comparto disponibilidad y detalles.", time: "09:15" },
      { id: "m3", role: "client", content: "Podemos visitar el depto manana por la tarde?", time: "09:18" },
    ],
  },
  {
    id: "conv-2",
    name: "Franco Medina",
    channel: "Instagram",
    unread: 0,
    lastMessage: "Gracias, espero el plano.",
    messages: [
      { id: "m4", role: "client", content: "Tiene patio propio?", time: "Ayer" },
      { id: "m5", role: "agent", content: "Si, y ademas entrada independiente.", time: "Ayer" },
      { id: "m6", role: "client", content: "Gracias, espero el plano.", time: "Ayer" },
    ],
  },
];

export const aiMessages: AIMessage[] = [
  {
    id: "ai-1",
    role: "assistant",
    content: "Puedo ayudarte a redactar respuestas, resumir conversaciones y sugerir proximos pasos comerciales.",
  },
];

export const calls: CallLog[] = [
  {
    id: "call-1",
    contact: "Lucia Alvarez",
    status: "Completada",
    summary: "Interes alto. Pidio propuesta formal y visita tecnica.",
    when: "Hoy 10:30",
  },
  {
    id: "call-2",
    contact: "Franco Medina",
    status: "Pendiente",
    summary: "Recordatorio para confirmar expensas y disponibilidad.",
    when: "Hoy 15:00",
  },
  {
    id: "call-3",
    contact: "Bruno Rey",
    status: "Perdida",
    summary: "No respondio. Reagendar con mensaje automatico.",
    when: "Ayer 18:10",
  },
];
