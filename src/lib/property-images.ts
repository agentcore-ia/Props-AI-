import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "property-images";

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

async function ensureBucket() {
  const admin = createAdminClient();
  const { data: buckets, error } = await admin.storage.listBuckets();

  if (error) {
    throw error;
  }

  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error: createError } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    });

    if (createError && !String(createError.message).includes("already exists")) {
      throw createError;
    }
  }
}

export async function uploadPropertyImages({
  tenantSlug,
  files,
}: {
  tenantSlug: string;
  files: File[];
}) {
  if (files.length === 0) {
    return [];
  }

  await ensureBucket();

  const admin = createAdminClient();
  const uploaded: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = sanitizeFilename(file.name || `${crypto.randomUUID()}.jpg`);
    const path = `${tenantSlug}/${Date.now()}-${crypto.randomUUID()}-${filename}`;

    const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    uploaded.push(data.publicUrl);
  }

  return uploaded;
}
