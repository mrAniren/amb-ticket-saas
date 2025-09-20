import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// Конфигурация для сборки библиотеки
export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
      exclude: ["**/*.stories.tsx", "**/fixtures/**", "**/demo/**", "**/main.tsx"],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "index",
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "lodash",
        "react-selecto",
        "svg-pan-zoom",
        "uuid"
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          lodash: "lodash",
          "react-selecto": "Selecto",
          "svg-pan-zoom": "svgPanZoom",
          uuid: "uuid",
        },
      },
    },
  },
});