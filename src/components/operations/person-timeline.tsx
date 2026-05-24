import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import type { PersonTimelineEvent } from "@/lib/operations-types";
import { cn } from "@/lib/utils";

const toneClass = {
  info: "bg-primary/10 text-primary",
  warning: "bg-amber-500/10 text-amber-700",
  success: "bg-emerald-500/10 text-emerald-700",
  danger: "bg-red-500/10 text-red-700",
};

export function PersonTimeline({
  title = "Timeline",
  events,
  empty = "Todavía no hay movimientos registrados para esta persona.",
  compact = false,
}: {
  title?: string;
  events: PersonTimelineEvent[];
  empty?: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="size-4 text-primary" />
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        <span className="rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">
          {events.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {events.length > 0 ? (
          events.slice(0, compact ? 4 : 7).map((event) => (
            <article key={event.id} className="rounded-xl border bg-background px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", toneClass[event.tone])}>
                      {event.type}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(event.at).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{event.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {event.description}
                  </p>
                </div>
                {event.href ? (
                  <Link
                    href={event.href}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-primary"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed bg-background p-3 text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
