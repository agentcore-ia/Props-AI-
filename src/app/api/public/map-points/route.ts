import { NextRequest, NextResponse } from "next/server";

type ListingInput = {
  id: string;
  title: string;
  routeHref: string;
  location: string;
  exactAddress?: string;
  price: number;
  currency: "USD" | "ARS";
};

type MapPoint = ListingInput & {
  latitude: number;
  longitude: number;
  resolvedAddress: string;
};

type GeocodeCacheEntry = {
  latitude: number;
  longitude: number;
  resolvedAddress: string;
};

const geocodeCache = new Map<string, GeocodeCacheEntry | null>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const listings = Array.isArray(body?.listings) ? (body.listings as ListingInput[]) : [];

    const points = (
      await Promise.all(
        listings.map(async (listing) => {
          const address = normalizeAddress(listing.exactAddress || listing.location);

          if (!address) {
            return null;
          }

          const geocoded = await geocodeAddress(address);

          if (!geocoded) {
            return null;
          }

          return {
            ...listing,
            ...geocoded,
          } satisfies MapPoint;
        })
      )
    ).filter(Boolean) as MapPoint[];

    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ points: [] }, { status: 200 });
  }
}

function normalizeAddress(address: string) {
  return address.trim().replace(/\s+/g, " ");
}

async function geocodeAddress(address: string) {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address) ?? null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", address);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PropsAI/1.0 (+https://props.com.ar)",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      geocodeCache.set(address, null);
      return null;
    }

    const payload = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    const first = payload[0];

    if (!first?.lat || !first?.lon) {
      geocodeCache.set(address, null);
      return null;
    }

    const entry = {
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      resolvedAddress: first.display_name || address,
    } satisfies GeocodeCacheEntry;

    geocodeCache.set(address, entry);
    return entry;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
}
