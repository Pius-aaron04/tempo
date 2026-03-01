import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external: [
        "better-sqlite3",
        "electron",
        "path",
        "fs",
        "net",
        "os",
        "child_process",
        "electron/js2c/asar_bundle",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
    target: "node18",
  },
  ssr: {
    noExternal: true, // bundle everything except externals
  },
});
