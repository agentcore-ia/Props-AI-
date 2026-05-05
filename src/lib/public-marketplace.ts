import type { Agency, Property } from "@/lib/mock-data";

export type MarketplaceSection =
  | "explorar"
  | "mapa"
  | "favoritos"
  | "inversiones";

export type PublicListing = Property & {
  agencyName: string;
  agencyCity: string;
  agencyTagline: string;
  routeHref: string;
  catalogHref: string;
  bedrooms: number;
  bathrooms: number;
  suites: number;
  area: number;
  lotArea: number;
  yearBuilt: number;
  pricePerSquareMeter: number;
  propertyType: Property["propertyType"];
  featuredLabel: string | null;
  mapX: number;
  mapY: number;
  investmentScore: number;
  yieldPercent: number;
  appreciationPercent: number;
  neighborhood: string;
  summary: string;
};

const amenitySets = [
  ["Balcon aterrazado", "SUM", "Cowork", "Pileta"],
  ["Cochera", "Seguridad 24 hs", "Parrilla", "Laundry"],
  ["Jardin", "Galeria", "Domotica", "Terraza"],
  ["Amenities premium", "Gym", "Piscina climatizada", "Spa"],
  ["Muelle", "Vista abierta", "Quincho", "Espacio kids"],
];

const propertyTypes: PublicListing["propertyType"][] = [
  "Departamento",
  "Casa",
  "PH",
  "Loft",
  "Townhouse",
];

const mapAnchors = [
  { x: 24, y: 30 },
  { x: 48, y: 41 },
  { x: 68, y: 23 },
  { x: 59, y: 69 },
  { x: 34, y: 58 },
  { x: 76, y: 52 },
  { x: 18, y: 67 },
  { x: 83, y: 36 },
];

export function normalizeMarketplaceSection(
  value: string | string[] | undefined
): MarketplaceSection {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    candidate === "mapa" ||
    candidate === "favoritos" ||
    candidate === "inversiones"
  ) {
    return candidate;
  }

  return "explorar";
}

export function buildPublicListings(
  properties: Property[],
  agencies: Agency[]
): PublicListing[] {
  const agencyBySlug = new Map(agencies.map((agency) => [agency.slug, agency]));

  return properties.map((property, index) => {
    const agency = agencyBySlug.get(property.tenantSlug);
    const mapAnchor = mapAnchors[index % mapAnchors.length];
    const bedrooms = property.bedrooms || 2 + (index % 4);
    const bathrooms = property.bathrooms || 1.5 + ((index + 1) % 4) * 0.5;
    const suites = 1 + (index % 3);
    const area = property.area || 85 + index * 28;
    const lotArea = area + 40 + (index % 4) * 35;
    const yearBuilt = 2019 + (index % 6);
    const propertyType = resolvePropertyType(property, index);
    const featuredLabel = resolveFeaturedLabel(property);
    const amenities = property.amenities.length > 0 ? property.amenities : amenitySets[index % amenitySets.length];
    const neighborhood = property.location.split(",")[0]?.trim() ?? property.location;
    const pricePerSquareMeter = Math.max(900, Math.round(property.price / area));
    const yieldPercent = Number((4.2 + (index % 5) * 0.45).toFixed(1));
    const appreciationPercent = Number((8.5 + (index % 4) * 1.2).toFixed(1));
    const investmentScore = Math.min(
      98,
      Math.round(72 + yieldPercent * 2 + appreciationPercent)
    );

    return {
      ...property,
      agencyName: agency?.name ?? property.tenantSlug,
      agencyCity: agency?.city ?? "Buenos Aires",
      agencyTagline: agency?.tagline ?? "Coleccion curada en Props",
      routeHref: `/propiedad/${property.tenantSlug}/${property.id}`,
      catalogHref: `https://${property.tenantSlug}.props.com.ar`,
      bedrooms,
      bathrooms,
      suites,
      area,
      lotArea,
      yearBuilt,
      pricePerSquareMeter,
      propertyType,
      featuredLabel,
      amenities,
      mapX: mapAnchor.x,
      mapY: mapAnchor.y,
      investmentScore,
      yieldPercent,
      appreciationPercent,
      neighborhood,
      summary: buildSummary(property),
    };
  });
}

function resolveFeaturedLabel(property: Property) {
  const visitCount = typeof property.visitCount === "number" ? property.visitCount : 0;

  if (visitCount >= 20) {
    return "Destacado";
  }

  return null;
}

function resolvePropertyType(
  property: Property,
  index: number
): PublicListing["propertyType"] {
  if (property.propertyType) {
    return property.propertyType;
  }

  const title = `${property.title} ${property.description}`.toLowerCase();

  if (title.includes("casa")) return "Casa";
  if (title.includes("ph")) return "PH";
  if (title.includes("loft")) return "Loft";
  if (title.includes("townhouse")) return "Townhouse";
  if (title.includes("torre") || title.includes("depto") || title.includes("departamento")) {
    return "Departamento";
  }

  return propertyTypes[index % propertyTypes.length];
}

function buildSummary(property: Property) {
  const location = property.location || "una ubicacion destacada";
  const descriptor = `${property.propertyType.toLowerCase()} para ${property.operation.toLowerCase()} en ${location}`;
  const area = property.area ? `${property.area} m2` : null;
  const layout = [
    property.bedrooms ? `${property.bedrooms} dormitorio${property.bedrooms > 1 ? "s" : ""}` : null,
    property.bathrooms ? `${property.bathrooms} baño${property.bathrooms > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const baseCopy = compactSentence(property.description);

  return [descriptor, [area, layout].filter(Boolean).join(" · "), baseCopy]
    .filter(Boolean)
    .join(". ");
}

function compactSentence(description: string) {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const firstSentence = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .find(Boolean);

  if (firstSentence && firstSentence.length <= 180) {
    return firstSentence;
  }

  return `${normalized.slice(0, 170).trimEnd()}...`;
}
