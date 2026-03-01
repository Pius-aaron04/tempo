import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["cjs"],
  target: "node18",
  clean: true,
  bundle: true,
  noExternal: [/(.*)/], // Bundle all dependencies (including workspace packages) into the single file
  external: ["better-sqlite3", "electron"], // Keep native modules external
});
