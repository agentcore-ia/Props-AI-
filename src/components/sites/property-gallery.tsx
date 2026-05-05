"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

import { cn } from "@/lib/utils";

export function PropertyGallery({
  title,
  images,
  className,
}: {
  title: string;
  images: string[];
  className?: string;
}) {
  const gallery = useMemo(() => images.filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!gallery.length) {
    return null;
  }

  const activeImage = gallery[activeIndex] ?? gallery[0];

  function goNext() {
    setActiveIndex((current) => (current + 1) % gallery.length);
  }

  function goPrev() {
    setActiveIndex((current) => (current - 1 + gallery.length) % gallery.length);
  }

  return (
    <>
      <div className={cn("min-w-0 space-y-3", className)}>
        <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white sm:rounded-[28px]">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative block h-[240px] w-full bg-slate-100 sm:h-[420px] xl:h-[540px]"
          >
            <Image
              src={activeImage}
              alt={`${title} - imagen ${activeIndex + 1}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent px-4 py-4 text-left text-white">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Imagen principal
                  </p>
                  <p className="mt-1 text-sm font-medium sm:text-base">
                    {activeIndex + 1} / {gallery.length}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur">
                  <Expand className="size-3.5" />
                  Abrir
                </span>
              </div>
            </div>
          </button>

          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/95 text-slate-900 shadow-lg backdrop-blur transition-colors hover:bg-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/95 text-slate-900 shadow-lg backdrop-blur transition-colors hover:bg-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          ) : null}
        </div>

        {gallery.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-3">
            {gallery.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-16 w-20 shrink-0 overflow-hidden rounded-[16px] border bg-white sm:h-24 sm:w-32 sm:rounded-[18px]",
                  index === activeIndex ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-200"
                )}
              >
                <Image
                  src={image}
                  alt={`${title} - miniatura ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightboxOpen ? (
        <div className="fixed inset-0 z-[90] bg-slate-950/92 backdrop-blur-sm">
          <div className="flex h-full flex-col px-4 py-4 sm:px-6">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white/70">{title}</p>
                <p className="mt-1 text-sm">
                  Imagen {activeIndex + 1} de {gallery.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white text-slate-950 shadow-lg"
                aria-label="Cerrar galeria"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mx-auto mt-4 flex w-full max-w-6xl flex-1 items-center justify-center">
              <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-[24px] bg-slate-900 sm:rounded-[28px]">
                <Image
                  src={activeImage}
                  alt={`${title} - ampliada ${activeIndex + 1}`}
                  fill
                  className="object-contain"
                />
                {gallery.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/95 text-slate-950 shadow-lg"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/95 text-slate-950 shadow-lg"
                      aria-label="Imagen siguiente"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {gallery.length > 1 ? (
              <div className="mx-auto mt-4 flex w-full max-w-6xl items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white sm:hidden"
                >
                  <ChevronLeft className="size-4" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white px-4 py-3 text-sm font-semibold text-slate-950 sm:hidden"
                >
                  <X className="size-4" />
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white sm:hidden"
                >
                  <ChevronRight className="size-4" />
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
