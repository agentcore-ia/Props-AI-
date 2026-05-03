import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { MessageSquareText, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { buildAppUrl, buildMarketplaceUrl } from "@/lib/request-url";
import { listMarketplaceConversationSummaries } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function CustomerAccountPage() {
  const current = await getCurrentUserContext();
  const requestHeaders = headers();

  if (!current) {
    redirect(buildMarketplaceUrl("/cuenta/login?redirectTo=/cuenta", requestHeaders).toString());
  }

  if (current.profile.role !== "customer") {
    redirect(buildAppUrl("/dashboard", requestHeaders).toString());
  }

  const conversations = await listMarketplaceConversationSummaries(current.user.id);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(237,242,255,0.88)_0%,rgba(247,249,252,1)_28%,rgba(255,255,255,1)_100%)]">
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div>
            <p className="text-sm font-medium text-slate-500">Cuenta de cliente</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
              {current.profile.full_name ?? current.user.email}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 sm:inline-flex"
            >
              Volver a explorar
            </Link>
            <form method="post" action="/cuenta/logout">
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white"
              >
                Cerrar sesion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 sm:px-6 xl:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.2)]">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <UserRound className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">Email de acceso</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{current.user.email}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.2)]">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <MessageSquareText className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">Conversaciones activas</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{conversations.length}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_22px_55px_-42px_rgba(15,23,42,0.26)]">
            <p className="text-sm font-medium text-white/65">Que puedes hacer desde aca</p>
            <p className="mt-2 text-lg font-semibold">Retomar conversaciones y volver a propiedades que ya consultaste.</p>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.22)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Seguimiento comercial</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Tus conversaciones con inmobiliarias
              </h2>
            </div>
            <Link href="/" className="text-sm font-semibold text-blue-700">
              Seguir explorando
            </Link>
          </div>

          {conversations.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {conversations.map((conversation) => (
                <article
                  key={conversation.id}
                  className="grid gap-4 rounded-[26px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[140px_1fr]"
                >
                  <div className="relative h-28 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                    {conversation.property?.image ? (
                      <Image
                        src={conversation.property.image}
                        alt={conversation.property.title}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          {conversation.agency?.name ?? "Inmobiliaria"}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-950">
                          {conversation.property?.title ?? conversation.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {conversation.property?.location ?? conversation.agency?.city}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {conversation.status}
                      </span>
                    </div>

                    <div className="mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      {conversation.lastMessage?.content ?? "Todavia sin mensajes."}
                    </div>

                    {conversation.property ? (
                      <div className="mt-4">
                        <Link
                          href={`/propiedad/${conversation.agency?.slug ?? ""}/${conversation.property.id}`}
                          className="text-sm font-semibold text-blue-700"
                        >
                          Volver a la propiedad
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
              <h3 className="text-2xl font-semibold text-slate-950">
                Todavia no iniciaste conversaciones
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Explora propiedades, abre una ficha y habla con la IA para que te ayude a preparar la consulta antes de contactar a la inmobiliaria.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
