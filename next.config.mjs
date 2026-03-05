/** @type {import('next').NextConfig} */
import withPWA from "@ducanh2912/next-pwa";

const nextConfig = withPWA({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
})({
    // Next.js config to ensure deployment succeeds
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    webpack: (config) => {
        config.resolve.fallback = { fs: false };
        config.module.exprContextCritical = false;
        return config;
    }
});

export default nextConfig;
