/**
 * Writes public/version.json from package.json so deployed clients can fetch
 * the live version and compare to the embedded bundle version.
 */
const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "package.json");
const outPath = path.join(__dirname, "..", "public", "version.json");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const payload = {
  version: String(pkg.version || "0.0.0"),
  builtAt: new Date().toISOString(),
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log("[write-version]", outPath, "->", payload.version);
