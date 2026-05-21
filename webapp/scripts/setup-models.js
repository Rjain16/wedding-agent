#!/usr/bin/env node
/**
 * Copies face-api.js model weights from node_modules into public/models/
 * so they can be served statically. Run with: npm run setup-models
 */
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../node_modules/@vladmandic/face-api/model");
const dest = path.resolve(__dirname, "../public/models");

if (!fs.existsSync(src)) {
  console.error("[setup-models] @vladmandic/face-api not found. Run `npm install` first.");
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });

const files = fs.readdirSync(src);
let copied = 0;

for (const file of files) {
  const srcFile = path.join(src, file);
  const destFile = path.join(dest, file);
  if (!fs.existsSync(destFile)) {
    fs.copyFileSync(srcFile, destFile);
    copied++;
  }
}

console.log(`[setup-models] ${copied} model file(s) copied to public/models/ (${files.length - copied} already present)`);
