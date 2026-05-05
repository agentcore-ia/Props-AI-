import { NextRequest, NextResponse } from "next/server";

type AddressSuggestion = {
  label: string;
  exactAddress: string;
  location: string;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PropsAI/1.0 (+https://props.com.ar)",
      },
      next: { revalidate: 60 * 60 * 6 },
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const payload = (await response.json()) as Array<{
      display_name?: string;
      address?: Record<string, string | undefined>;
    }>;

    const suggestions = payload.map(normalizeSuggestion).filter(Boolean) as AddressSuggestion[];

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}

function normalizeSuggestion(item: {
  display_name?: string;
  address?: Record<string, string | undefined>;
}) {
  const exactAddress = item.display_name?.trim();

  if (!exactAddress) {
    return null;
  }

  const address = item.address ?? {};
  const neighborhood =
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.town ||
    address.village ||
    address.city;
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.state_district ||
    address.state;

  return {
    label: exactAddress,
    exactAddress,
    location: [neighborhood, city].filter(Boolean).join(", "),
  } satisfies AddressSuggestion;
}
