import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
);

export default defineConfig({
  plugins: [react({ include: "**/*.{js,jsx,ts,tsx}" })],
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    // Only scan the real app entry, not generated public/build HTML files.
    entries: ["index.html"],
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  resolve: {
    extensions: [".mjs", ".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || "0.0.0"),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ["@mui/material", "@emotion/react", "@emotion/styled", "@emotion/cache"],
          muiIcons: ["@mui/icons-material"],
          framerMotion: ["framer-motion"],
          recharts: ["recharts"],
          xlsx: ["xlsx"],
          slick: ["react-slick", "slick-carousel"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
