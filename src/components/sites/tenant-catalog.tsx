"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  Building2,
  ChevronRight,
  MapPin,
  MessageCircleMore,
  Search,
  SendHorizonal,
  Sparkles,
} from "lucide-react";

import type { Agency, Property } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const quickPrompts = [
  "Busco 2 ambientes para inversión",
  "Quiero una casa con jardín para familia",
  "Necesito alquiler amoblado en CABA",
];

function inferOperation(prompt: string) {
  const text = prompt.toLowerCase();

  if (text.includes("alquiler") || text.includes("alquilar") || text.includes("amoblado")) {
    return "Alquiler";
  }

  if (text.includes("venta") || text.includes("comprar") || text.includes("invers")) {
    return "Venta";
  }

  return null;
}

function matchScore(property: Property, prompt: string) {
  const haystack = `${property.title} ${property.location} ${property.description} ${property.operation}`.toLowerCase();
  const tokens = prompt
    .toLowerCase()
    .split(/[\s,.;:!?]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);

  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function buildAssistantReply(prompt: string, properties: Property[]) {
  const operation = inferOperation(prompt);
  const filteredByOperation = operation
    ? properties.filter((property) => property.operation === operation)
    : properties;

  const ranked = [...filteredByOperation]
    .map((property) => ({
      property,
      score: matchScore(property, prompt),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.property);

  if (ranked.length === 0) {
    return "No encontré una coincidencia clara todavía. Probá sumar zona, presupuesto aproximado o si querés compra o alquiler.";
  }

  const intro = operation
    ? `Te recomendaría estas opciones de ${operation.toLowerCase()} que encajan bastante bien con lo que describiste:`
    : "Te recomendaría empezar por estas propiedades, que son las más alineadas con lo que me contaste:";

  const list = ranked
    .map(
      (property) =>
        `• ${property.title} en ${property.location} por ${formatCurrency(property.price)}`
    )
    .join("\n");

  return `${intro}\n${list}\n\nSi querés, decime presupuesto, zona ideal y tipo de propiedad y te afino más la búsqueda.`;
}

export function TenantCatalog({
  agency,
  properties,
}: {
  agency: Agency | null;
  properties: Property[];
}) {
  const [operationFilter, setOperationFilter] = useState<"all" | Property["operation"]>("all");
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content:
        "Contame qué tipo de propiedad buscás y te sugiero las opciones más convenientes de este catálogo.",
    },
  ]);

  const filteredProperties = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesOperation =
        operationFilter === "all" ? true : property.operation === operationFilter;

      if (!matchesOperation) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = `${property.title} ${property.location} ${property.description} ${property.operation}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [deferredSearch, operationFilter, properties]);

  const availableForSale = properties.filter((property) => property.operation === "Venta").length;
  const availableForRent = properties.filter((property) => property.operation === "Alquiler").length;

  function sendAssistantPrompt(prompt: string) {
    const value = prompt.trim();
    if (!value) return;

    startTransition(() => {
      setAssistantMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: value,
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: buildAssistantReply(value, properties),
        },
      ]);
      setAssistantInput("");
    });
  }

  if (!agency) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-xl rounded-[32px] border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Inmobiliaria no encontrada</h1>
          <p className="mt-3 text-sm text-slate-600">
            Este subdominio todavía no fue provisionado o no existe en el entorno actual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(236,244,255,0.96)_0%,rgba(248,250,252,1)_28%,rgba(255,255,255,1)_100%)]">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-5 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                <Building2 className="size-3.5" />
                Catálogo inteligente
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                {agency.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                {agency.tagline} Explorá oportunidades de venta y alquiler con una experiencia guiada para encontrar la propiedad correcta más rápido.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ciudad</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{agency.city}</p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">En venta</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{availableForSale}</p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">En alquiler</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{availableForRent}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="flex flex-col justify-between px-6 py-7 sm:px-8">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Buscador guiado</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                      Descubrí propiedades con filtros claros y respuesta inmediata
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                      Filtrá por operación, buscá por zona o contale a la IA qué necesitás. La idea es que un cliente avance sin fricción ni ruido.
                    </p>
                  </div>

                  <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Buscar por barrio, tipología, amenities o nombre..."
                        className="h-12 rounded-2xl border-0 bg-white pl-11 shadow-none ring-1 ring-slate-200"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setSearchValue(prompt)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative min-h-[320px] overflow-hidden bg-slate-100">
                  <Image
                    src={properties[0]?.image ?? "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"}
                    alt={agency.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md">
                      <Sparkles className="size-3.5" />
                      Selección curada
                    </div>
                    <p className="mt-3 text-2xl font-semibold">
                      Propiedades que se presentan mejor, convierten mejor
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-white/80">
                      Una experiencia simple, moderna y lista para acompañar la decisión de compra o alquiler.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-[36px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.65)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                    <Bot className="size-3.5" />
                    IA de búsqueda
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold">Contale qué estás buscando</h3>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                  <MessageCircleMore className="size-5" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {assistantMessages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "assistant"
                        ? "rounded-[22px] bg-white/8 p-4 text-sm leading-6 text-white/85"
                        : "ml-auto max-w-[88%] rounded-[22px] bg-blue-500 px-4 py-3 text-sm font-medium text-white"
                    }
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <Textarea
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  placeholder="Ej: busco alquiler de 2 ambientes en Palermo con balcón y buena luz."
                  className="min-h-28 rounded-[24px] border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/45"
                />
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendAssistantPrompt(prompt)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <Button
                  className="h-11 w-full rounded-2xl bg-white text-slate-950 hover:bg-blue-50"
                  onClick={() => sendAssistantPrompt(assistantInput)}
                >
                  Consultar a la IA
                  <SendHorizonal className="ml-2 size-4" />
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 xl:px-8">
        <Tabs
          value={operationFilter}
          onValueChange={(value) =>
            setOperationFilter(value as "all" | Property["operation"])
          }
          className="gap-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Colección disponible</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Propiedades listas para explorar
              </h2>
            </div>

            <TabsList className="h-auto rounded-[22px] bg-slate-100 p-1.5">
              <TabsTrigger value="all" className="rounded-[18px] px-5 py-2.5">
                Todo
              </TabsTrigger>
              <TabsTrigger value="Venta" className="rounded-[18px] px-5 py-2.5">
                Venta
              </TabsTrigger>
              <TabsTrigger value="Alquiler" className="rounded-[18px] px-5 py-2.5">
                Alquiler
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={operationFilter} className="mt-0">
            {filteredProperties.length > 0 ? (
              <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {filteredProperties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/propiedad/${property.id}`}
                    className="group overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.32)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_80px_-42px_rgba(37,99,235,0.35)]"
                  >
                    <div className="relative h-72 overflow-hidden">
                      <Image
                        src={property.image}
                        alt={property.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                      <div className="absolute left-5 top-5 flex items-center gap-2">
                        <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-slate-900">
                          {property.operation}
                        </span>
                        <span className="rounded-full bg-slate-900/75 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          {property.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                            {property.title}
                          </h3>
                          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                            <MapPin className="size-4" />
                            <span>{property.location}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Precio
                          </p>
                          <p className="mt-1 text-xl font-semibold text-slate-950">
                            {formatCurrency(property.price)}
                          </p>
                        </div>
                      </div>

                      <p className="line-clamp-2 text-sm leading-7 text-slate-600">
                        {property.description}
                      </p>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-sm font-medium text-slate-500">
                          Ver detalle completo
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                          Explorar
                          <ChevronRight className="size-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            ) : (
              <div className="rounded-[34px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  Sin resultados
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                  No encontramos propiedades con esos filtros
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                  Probá cambiar el tipo de operación, limpiar el buscador o pedirle ayuda al asistente IA para refinar la búsqueda.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
