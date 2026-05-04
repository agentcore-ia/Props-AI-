"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { agencies, properties, type Agency, type Property } from "@/lib/mock-data";

type AgencyInput = {
  name: string;
  slug: string;
  email: string;
  phone: string;
  ownerName: string;
  ownerEmail: string;
  city: string;
};

type PropertyInput = {
  tenantSlug: string;
  title: string;
  price: number;
  currency: Property["currency"];
  description: string;
  status: Property["status"];
  operation: Property["operation"];
  location: string;
  exactAddress: string;
  image: string;
};

type PropsStore = {
  agencies: Agency[];
  properties: Property[];
  createAgency: (input: AgencyInput) => void;
  createProperty: (input: PropertyInput) => void;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80";

export const usePropsStore = create<PropsStore>()(
  persist(
    (set) => ({
      agencies,
      properties,
      createAgency: (input) =>
        set((state) => ({
          agencies: [
            {
              id: crypto.randomUUID(),
              name: input.name,
              slug: input.slug.toLowerCase().trim(),
              email: input.email,
              phone: input.phone,
              ownerName: input.ownerName,
              ownerEmail: input.ownerEmail,
              city: input.city,
              plan: "Starter",
              status: "En onboarding",
              tagline: `Catalogo digital de ${input.name}.`,
            },
            ...state.agencies,
          ],
        })),
      createProperty: (input) =>
        set((state) => ({
          properties: [
            {
              id: crypto.randomUUID(),
              tenantSlug: input.tenantSlug,
              title: input.title,
              price: input.price,
              currency: input.currency,
              description: input.description,
              status: input.status,
              operation: input.operation,
              location: input.location,
              exactAddress: input.exactAddress,
              image: input.image || fallbackImage,
              images: [input.image || fallbackImage, fallbackImage, fallbackImage],
              propertyType: "Departamento",
              bedrooms: 0,
              bathrooms: 0,
              area: 0,
              parkingSpots: 0,
              furnished: false,
              expenses: null,
              expensesCurrency: null,
              availableFrom: null,
              petsPolicy: "",
              requirements: "",
              amenities: [],
              rentalContract: null,
            },
            ...state.properties,
          ],
        })),
    }),
    {
      name: "props-multitenant-store",
    }
  )
);
