import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // In production (bundled), __dirname is the directory containing index.js
  // We expect public files to be in __dirname/public
  const distPath = path.resolve(__dirname, "public");

  console.log(`Attempting to serve static files from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.warn(
      `WARNING: Could not find the build directory: ${distPath}. Client files may not be served correctly.`,
    );
    // Try to list directory contents for debugging (will show in console/logs)
    try {
      console.log(`Contents of ${__dirname}:`, fs.readdirSync(__dirname));
    } catch (e) {
      console.log(`Could not list ${__dirname}`);
    }
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`Application files not found. Searched at: ${distPath}`);
    }
  });
}
