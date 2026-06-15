#!/usr/bin/env node
import { probeRail, probeRails } from "../src/index.js";

function parseArgs(argv) {
  const urls = []; const headers = {}; let stdin = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stdin") stdin = true;
    else if (a === "--header" || a === "-H") {
      const h = argv[++i] || ""; const idx = h.indexOf(":");
      if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: rail-probe [--header 'K: V'] <url> [<url> ...] | --stdin");
      process.exit(0);
    } else { urls.push(a); }
  }
  return { urls, headers, stdin };
}

function color(verdict) {
  const map = { ALIVE_OK:"\x1b[32m", ALIVE_AUTH_BLOCKED:"\x1b[33m", RATE_LIMITED:"\x1b[33m",
    DEGRADED:"\x1b[35m", ABSENT:"\x1b[31m", UNREACHABLE:"\x1b[31m" };
  return `${map[verdict] || ""}${verdict}\x1b[0m`;
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const { urls, headers, stdin } = parseArgs(process.argv.slice(2));
  let results;
  if (stdin) {
    const rails = JSON.parse(await readStdin());
    results = await probeRails(rails, { headers });
  } else if (urls.length) {
    results = await Promise.all(urls.map(async (u) => ({ name: u, ...(await probeRail(u, { headers })) })));
  } else { console.error("No URLs given. See --help."); process.exit(2); }
  for (const r of results) {
    const status = r.status === null ? "---" : r.status;
    console.log(`${color(r.verdict).padEnd(30)} ${String(status).padStart(3)}  ${r.ms}ms  ${r.name}${r.error ? "  (" + r.error + ")" : ""}`);
  }
  process.exit(results.some((r) => r.routable) ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
