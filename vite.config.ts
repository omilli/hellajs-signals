import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["./lib"],
      outDir: "./dist",
      entryRoot: "./lib",
      tsconfigPath: "./tsconfig.json",
    }),
  ],
  build: {
    target: "esnext",
    minify: "esbuild",
    lib: {
      name: "@hellajs/reactive",
      entry: "./lib/index.ts",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "umd", "cjs"],
    },
    rollupOptions: {
      external: ["@hellajs/core"],
      output: {
        globals: {
          "@hellajs/core": "Hella",
        },
      },
    },
  },
  esbuild: {
    pure: ["console.warn", "console.error"],
    legalComments: "none",
  },
});
