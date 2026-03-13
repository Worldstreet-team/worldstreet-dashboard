import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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

    // Ignore TronWeb module resolution errors
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.IgnorePlugin({
        checkResource(resource, context) {
          // Ignore @noble package resolution errors in TronWeb
          if (context && context.includes('tronweb') && 
              (resource.includes('@noble/hashes') || resource.includes('@noble/curves'))) {
            return true;
          }
          return false;
        }
      })
    );

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

    // Ignore specific module not found errors for TronWeb
    config.ignoreWarnings = [
      {
        module: /node_modules\/tronweb/,
        message: /Module not found.*@noble/,
      },
      {
        module: /TronBridgeInterface/,
        message: /Module not found.*@noble/,
      },
      /Module not found.*Package path.*@noble/,
      /Can't resolve.*@noble.*utils\.js/,
      /Can't resolve.*@noble.*sha3/,
    ];

    // Also ignore these errors at the stats level
    config.stats = {
      ...config.stats,
      warningsFilter: [
        /Module not found.*@noble/,
        /Can't resolve.*@noble/,
      ]
    };

    return config;
  },
  experimental: {
    optimizePackageImports: ["@iconify/react", "flowbite-react"],
  },
};

export default nextConfig;