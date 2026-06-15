import assert from "node:assert/strict";
import { classifyStatus, isRoutable, probeRail, Verdict } from "../src/index.js";

let passed = 0;
function t(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { console.log("  ok -", name); passed++; })
    .catch((e) => { console.error("  FAIL -", name, "\n", e); process.exitCode = 1; });
}

await t("401 -> ALIVE_AUTH_BLOCKED", () => assert.equal(classifyStatus(401), Verdict.ALIVE_AUTH_BLOCKED));
await t("403 -> ALIVE_AUTH_BLOCKED", () => assert.equal(classifyStatus(403), Verdict.ALIVE_AUTH_BLOCKED));
await t("200 -> ALIVE_OK", () => assert.equal(classifyStatus(200), Verdict.ALIVE_OK));
await t("301 -> ALIVE_OK", () => assert.equal(classifyStatus(301), Verdict.ALIVE_OK));
await t("404 -> ABSENT", () => assert.equal(classifyStatus(404), Verdict.ABSENT));
await t("429 -> RATE_LIMITED", () => assert.equal(classifyStatus(429), Verdict.RATE_LIMITED));
await t("503 -> DEGRADED", () => assert.equal(classifyStatus(503), Verdict.DEGRADED));
await t("auth-blocked is routable", () => assert.equal(isRoutable(Verdict.ALIVE_AUTH_BLOCKED), true));
await t("absent is NOT routable", () => assert.equal(isRoutable(Verdict.ABSENT), false));
await t("unreachable is NOT routable", () => assert.equal(isRoutable(Verdict.UNREACHABLE), false));
await t("probeRail classifies injected 401", async () => {
  const r = await probeRail("https://example.test", { fetchImpl: async () => ({ status: 401 }) });
  assert.equal(r.verdict, Verdict.ALIVE_AUTH_BLOCKED);
  assert.equal(r.routable, true); assert.equal(r.status, 401);
});
await t("probeRail handles thrown fetch as UNREACHABLE", async () => {
  const r = await probeRail("https://down.test", { fetchImpl: async () => { throw new Error("ECONNREFUSED"); } });
  assert.equal(r.verdict, Verdict.UNREACHABLE); assert.equal(r.routable, false);
  assert.match(r.error, /ECONNREFUSED/);
});
console.log(`\n${passed} assertions passed.`);
