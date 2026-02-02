
import { build } from "esbuild";
import path from "path";
import fs from "fs";

// Ensure dist directory exists
if (fs.existsSync("dist")) {
  fs.rmSync("dist", { recursive: true, force: true });
}
fs.mkdirSync("dist");

// Build Server
await build({
  entryPoints: ["server/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outdir: "dist",
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
  },
  // Mark all packages in node_modules as external to avoid bundling issues
  packages: "external",
});

// Build Client (Vite)
import { spawn } from "child_process";
const viteBuild = spawn("npx", ["vite", "build"], {
  stdio: "inherit",
  shell: true
});

viteBuild.on("close", (code) => {
  if (code === 0) {
    console.log("✅ Build Complete!");
  } else {
    console.error("❌ Build Failed");
    process.exit(1);
  }
});
