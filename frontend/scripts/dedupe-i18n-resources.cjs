/**
 * Removes duplicate keys inside each en/ar/ku translation object in i18nResources.js.
 * Keeps the first occurrence; drops later duplicates (including two-line entries).
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "src", "i18nResources.js");
const lines = fs.readFileSync(file, "utf8").split("\n");

/** Extract key from a line like `      "foo":` or `      bar:` */
function parseKeyLine(line) {
  const q = line.match(/^\s{6}("(?:\\.|[^"\\])*")\s*:/);
  if (q) {
    try {
      return { key: JSON.parse(q[1]) };
    } catch {
      return null;
    }
  }
  const u = line.match(/^\s{6}([a-zA-Z_$][\w$]*)\s*:/);
  if (u) return { key: u[1] };
  return null;
}

function isKeyOnlyLine(line) {
  return /^\s{6}(?:(?:"(?:\\.|[^"\\])*")|(?:[a-zA-Z_$][\w$]*))\s*:\s*$/.test(
    line,
  );
}

/** Find [startLine, endLine] 0-based inclusive for each `translation: { ... }` block body. */
function findTranslationBodies() {
  const ranges = [];
  let i = 0;
  while (i < lines.length) {
    if (/^\s{4}translation:\s*\{\s*$/.test(lines[i])) {
      const start = i + 1;
      let j = i + 1;
      while (j < lines.length && !/^\s{4}\},\s*$/.test(lines[j])) {
        j++;
      }
      if (j >= lines.length) break;
      ranges.push([start, j - 1]);
      i = j;
    } else {
      i++;
    }
  }
  return ranges;
}

const toRemove = new Set();

for (const [start, end] of findTranslationBodies()) {
  const seen = new Set();
  let lineIdx = start;
  while (lineIdx <= end) {
    const parsed = parseKeyLine(lines[lineIdx]);
    if (parsed) {
      const { key } = parsed;
      if (seen.has(key)) {
        toRemove.add(lineIdx);
        if (isKeyOnlyLine(lines[lineIdx]) && lineIdx + 1 <= end) {
          toRemove.add(lineIdx + 1);
          lineIdx++;
        }
      } else {
        seen.add(key);
      }
    }
    lineIdx++;
  }
}

const out = lines.filter((_, idx) => !toRemove.has(idx));
fs.writeFileSync(file, out.join("\n"), "utf8");
console.log(
  `dedupe-i18n-resources: removed ${toRemove.size} duplicate line(s) from ${path.basename(file)}`,
);
