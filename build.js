import isolatedDecl from "bun-plugin-isolated-decl";
import { readdirSync, unlinkSync, rmSync } from "fs";
import { join } from "path";

const srcDir = "./src";
const entrypoints = readdirSync(srcDir)
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
  .map((file) => join(srcDir, file));

console.log(entrypoints);

rmSync("./dist", { recursive: true, force: true });

await Bun.build({
  entrypoints,
  target: "bun",
  outdir: "./dist",
  plugins: [isolatedDecl()],
});

// Clean up .js files except index.js
const distFiles = readdirSync("./dist");
for (const file of distFiles) {
  if (file.endsWith(".js") && file !== "index.js") {
    unlinkSync(join("./dist", file));
  }
}
