const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : process.env.SUPABASE_URL
    ? new URL(process.env.SUPABASE_URL).hostname
  : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https",
              hostname: supabaseHost,
            },
          ]
        : [
            {
              protocol: "https",
              hostname: "bqkkeeinblcororibbgn.supabase.co",
            },
          ]),
    ],
  },
};

export default nextConfig;
