// scripts/build-preview.js

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const path = "./version.json";

const version = JSON.parse(readFileSync(path, "utf8"));

version.build += 1;

writeFileSync(path, JSON.stringify(version, null, 2));

console.log(`Building version ${version.version} (${version.build})`);

execSync("eas build -p android --profile preview", {
  stdio: "inherit",
});