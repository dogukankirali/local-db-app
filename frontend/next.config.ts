import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.node$/,
      use: "node-loader",
    });

    return config;
  },
  transpilePackages: [
    "@mui/material",
    "@mui/system",
    "@mui/icons-material",
    "@emotion/react",
    "@emotion/styled",
  ],
};

export default nextConfig;
