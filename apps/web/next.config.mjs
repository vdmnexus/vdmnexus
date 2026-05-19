/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/compute",
        destination: "/inference",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
