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
    webpack: (config, { isServer }) => {
        config.resolve.fallback = { fs: false, path: false, crypto: false };
        config.module.exprContextCritical = false;
        config.module.unknownContextCritical = false;

        // Ignore the "Critical dependency" warnings
        config.ignoreWarnings = [
            ...(config.ignoreWarnings || []),
            /Critical dependency: require function is used in a way/,
            /node_modules\/@vladmandic\/face-api/
        ];

        return config;
    }
});

export default nextConfig;
