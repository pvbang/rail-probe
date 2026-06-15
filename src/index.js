/**
 * @pvbang/rail-probe
 * Classify the TRUE liveness of an HTTP rail (auth-blocked vs capability-absent).
 * @module @pvbang/rail-probe
 */

/** Rail liveness verdicts. @readonly @enum {string} */
export const Verdict = Object.freeze({
  ALIVE_AUTH_BLOCKED: "ALIVE_AUTH_BLOCKED",
  ALIVE_OK: "ALIVE_OK",
  ABSENT: "ABSENT",
  DEGRADED: "DEGRADED",
  UNREACHABLE: "UNREACHABLE",
  RATE_LIMITED: "RATE_LIMITED",
});

/** Map an HTTP status code to a liveness verdict. */
export function classifyStatus(status) {
  if (status === 401 || status === 403) return Verdict.ALIVE_AUTH_BLOCKED;
  if (status === 429) return Verdict.RATE_LIMITED;
  if (status === 404 || status === 410) return Verdict.ABSENT;
  if (status >= 200 && status < 400) return Verdict.ALIVE_OK;
  if (status >= 500) return Verdict.DEGRADED;
  if (status >= 400 && status < 500) return Verdict.ALIVE_AUTH_BLOCKED;
  return Verdict.UNREACHABLE;
}

/** Whether a verdict means the rail exists and is worth routing around. */
export function isRoutable(verdict) {
  return (
    verdict === Verdict.ALIVE_OK ||
    verdict === Verdict.ALIVE_AUTH_BLOCKED ||
    verdict === Verdict.RATE_LIMITED ||
    verdict === Verdict.DEGRADED
  );
}

/** Probe a single rail. */
export async function probeRail(url, opts = {}) {
  const {
    method = "GET",
    headers = {},
    timeoutMs = 8000,
    fetchImpl = globalThis.fetch,
  } = opts;
  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation available (Node >=18 required).");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetchImpl(url, {
      method, headers, signal: controller.signal, redirect: "manual",
    });
    const verdict = classifyStatus(res.status);
    return { url, status: res.status, verdict, routable: isRoutable(verdict), ms: Date.now() - start };
  } catch (err) {
    return {
      url, status: null, verdict: Verdict.UNREACHABLE, routable: false,
      ms: Date.now() - start,
      error: err && err.name === "AbortError" ? "timeout" : String((err && err.message) || err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe many rails concurrently. */
export async function probeRails(rails, opts = {}) {
  return Promise.all(
    rails.map(async (r) => ({
      name: r.name,
      ...(await probeRail(r.url, { ...opts, headers: r.headers || opts.headers })),
    }))
  );
}

export default { Verdict, classifyStatus, isRoutable, probeRail, probeRails };
