"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { divIcon, latLngBounds } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import type { PublicListing } from "@/lib/public-marketplace";
import { formatMoney } from "@/lib/utils";

type MapPoint = Pick<
  PublicListing,
  "id" | "title" | "routeHref" | "location" | "exactAddress" | "price" | "currency"
> & {
  latitude: number;
  longitude: number;
  resolvedAddress: string;
};

const buenosAiresCenter: [number, number] = [-34.6037, -58.3816];

export function PublicMarketplaceMap({
  listings,
  selectedListingId,
  onSelect,
}: {
  listings: PublicListing[];
  selectedListingId: string | null;
  onSelect: (id: string) => void;
}) {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  useEffect(() => {
    let cancelled = false;

    async function loadMapPoints() {
      if (!listings.length) {
        setPoints([]);
        setStatus("ready");
        return;
      }

      setStatus("loading");

      try {
        const response = await fetch("/api/public/map-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listings: listings.map((listing) => ({
              id: listing.id,
              title: listing.title,
              routeHref: listing.routeHref,
              location: listing.location,
              exactAddress: listing.exactAddress,
              price: listing.price,
              currency: listing.currency,
            })),
          }),
        });

        const payload = (await response.json()) as { points?: MapPoint[] };

        if (!cancelled) {
          setPoints(Array.isArray(payload.points) ? payload.points : []);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setPoints([]);
          setStatus("ready");
        }
      }
    }

    loadMapPoints();

    return () => {
      cancelled = true;
    };
  }, [listings]);

  const selectedPoint =
    points.find((point) => point.id === selectedListingId) ?? points[0] ?? null;

  const bounds = useMemo(() => {
    if (!points.length) {
      return null;
    }

    return latLngBounds(points.map((point) => [point.latitude, point.longitude]));
  }, [points]);

  return (
    <div className="relative h-[58vh] min-h-[420px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] sm:h-[64vh] xl:h-[calc(100vh-220px)] xl:min-h-[640px]">
      <MapContainer
        center={selectedPoint ? [selectedPoint.latitude, selectedPoint.longitude] : buenosAiresCenter}
        zoom={selectedPoint ? 13 : 11}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportController bounds={bounds} selectedPoint={selectedPoint} />

        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={buildMarkerIcon(point, point.id === selectedListingId)}
            eventHandlers={{
              click: () => onSelect(point.id),
            }}
          >
            <Popup>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-950">{point.title}</p>
                <p className="text-xs text-slate-500">{point.resolvedAddress}</p>
                <p className="text-sm font-semibold text-slate-950">
                  {formatMoney(point.price, point.currency)}
                </p>
                <Link
                  href={point.routeHref}
                  className="inline-flex text-xs font-semibold text-blue-700"
                >
                  Ver ficha
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl border border-slate-200 bg-white/92 px-4 py-3 text-sm text-slate-500 shadow-lg backdrop-blur">
          Cargando ubicaciones publicadas...
        </div>
      ) : null}

      {status === "ready" && !points.length ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/92 text-sm text-slate-500">
          No pudimos ubicar estas propiedades en el mapa todavia.
        </div>
      ) : null}
    </div>
  );
}

function MapViewportController({
  bounds,
  selectedPoint,
}: {
  bounds: ReturnType<typeof latLngBounds> | null;
  selectedPoint: MapPoint | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPoint) {
      map.flyTo([selectedPoint.latitude, selectedPoint.longitude], Math.max(map.getZoom(), 13), {
        duration: 0.7,
      });
      return;
    }

    if (bounds) {
      map.fitBounds(bounds, { padding: [38, 38], maxZoom: 13 });
    }
  }, [bounds, map, selectedPoint]);

  return null;
}

function buildMarkerIcon(point: MapPoint, active: boolean) {
  const label = compactPrice(point.price, point.currency);

  return divIcon({
    className: "",
    html: `<span class="props-map-marker${active ? " props-map-marker--active" : ""}">${label}</span>`,
    iconAnchor: [24, 46],
    popupAnchor: [0, -42],
  });
}

function compactPrice(price: number, currency: "USD" | "ARS") {
  if (currency === "USD") {
    if (price >= 1_000_000) {
      return `US$ ${(price / 1_000_000).toFixed(1)}M`;
    }

    if (price >= 1_000) {
      return `US$ ${Math.round(price / 1_000)}k`;
    }

    return `US$ ${price}`;
  }

  if (price >= 1_000_000) {
    return `$ ${(price / 1_000_000).toFixed(1)}M`;
  }

  if (price >= 1_000) {
    return `$ ${Math.round(price / 1_000)}k`;
  }

  return `$ ${price}`;
}
