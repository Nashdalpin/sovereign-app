import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [{ source: '/goals', destination: '/sanctuary/vault', permanent: false }];
  },
};

export default nextConfig;
