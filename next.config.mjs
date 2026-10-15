/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Patients add scans from the portal through a server action; 1 MB (the default) is too small.
  experimental: { serverActions: { bodySizeLimit: "32mb" } },
};

export default nextConfig;
