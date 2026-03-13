import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@worldstreet/vivid-voice"],
  modularizeImports: {
    "@tabler/icons-react": {
      transform: "@tabler/icons-react/dist/esm/icons/{{member}}",
    },
  },
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support for tiny-secp256k1
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fix for WASM modules
    config.output = {
      ...config.output,
      webassemblyModuleFilename: isServer
        ? "./../static/wasm/[modulehash].wasm"
        : "static/wasm/[modulehash].wasm",
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Fix for TronWeb - handle .cjs files correctly
    config.module.rules.push({
      test: /\.cjs$/,
      type: "javascript/auto",
    });

    // Fallback for Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Fix TronWeb's @noble packages import issues
    config.resolve.alias = {
      ...config.resolve.alias,
      '@noble/hashes/sha3': '@noble/hashes/sha3',
      '@noble/hashes/utils': '@noble/hashes/utils', 
      '@noble/curves/secp256k1': '@noble/curves/secp256k1',
    };

    // Add module resolution for TronWeb compatibility
    config.module.rules.push({
      test: /node_modules\/tronweb/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  experimental: {
    optimizePackageImports: ["@iconify/react", "flowbite-react"],
  },
};

export default nextConfig;