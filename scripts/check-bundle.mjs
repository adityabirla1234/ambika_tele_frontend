// Runs after `vite build` (npm "postbuild"). Fails the build if the shipped files contain anything that looks like
// personal data, a device number, a developer shortcut or a secret. A guard against mistakes, not a proof.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function luhn(d) {
  let sum = 0, dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (dbl) { n *= 2; if (n > 9) n -= 9; }
    sum += n; dbl = !dbl;
  }
  return sum % 10 === 0;
}

const problems = [];
const files = walk(DIST).filter((f) => /\.(js|css|html|map|json|txt)$/.test(f));

for (const f of files) {
  const text = readFileSync(f, "utf8");
  const name = f.slice(DIST.length);
  if (name.endsWith(".map")) problems.push(`${name}: a source map was published`);
  if (/@ambika\.local/i.test(text)) problems.push(`${name}: a development staff email is in the bundle`);
  if (/dev-only/i.test(text)) problems.push(`${name}: a development-only secret marker is in the bundle`);
  if (/localhost:8080/.test(text)) problems.push(`${name}: the localhost API address is in the bundle`);
  if (/DEVICE_HMAC_KEY|DEVICE_ENCRYPTION_KEY|REPORT_TRIGGER_SECRET|TELEGRAM_BOT_TOKEN/.test(text)) {
    problems.push(`${name}: a backend secret name is in the bundle`);
  }
  if (/\b\d{9}:[A-Za-z0-9_-]{35}\b/.test(text)) problems.push(`${name}: something shaped like a Telegram bot token`);
  if (/(?<![\w.])\+?91[6-9]\d{9}(?!\d)/.test(text)) problems.push(`${name}: an Indian mobile number`);
  for (const m of text.matchAll(/(?<![\w.])\d{15}(?![\w.])/g)) {
    if (luhn(m[0])) { problems.push(`${name}: a 15-digit number that passes the IMEI check`); break; }
  }
}

if (problems.length) {
  console.error("\nBundle check FAILED:\n - " + problems.join("\n - ") + "\n");
  process.exit(1);
}
console.log(`Bundle check passed (${files.length} files scanned).`);
