# @pvbang/rail-probe

> Probe revenue/API rails and classify their **true** liveness — distinguish *auth-blocked* (alive, you lack a credential) from *capability-absent* (the rail genuinely does not exist).

A status code is not binary "up/down". A `401`/`403` means the rail is **alive but auth-blocked** — the blocker is a missing credential, not a missing service, so *route around it* (supply/refresh auth) rather than give up. A `404`/connection-refused means the rail is **genuinely absent**. Conflating the two wastes cycles re-verifying live rails instead of fixing the real blocker.

## Install

```bash
echo "@pvbang:registry=https://npm.pkg.github.com" >> .npmrc
npm install @pvbang/rail-probe
```

## CLI

```bash
npx rail-probe https://api.github.com
npx rail-probe -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
echo '[{"name":"gh","url":"https://api.github.com"}]' | npx rail-probe --stdin
```

Exit code is `0` if any rail is routable, `1` if every rail is absent/unreachable.

## API

```js
import { probeRail, classifyStatus, isRoutable, Verdict } from "@pvbang/rail-probe";
const r = await probeRail("https://api.github.com/user", {
  headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
});
if (r.verdict === Verdict.ALIVE_AUTH_BLOCKED) console.log("Exists - refresh credentials.");
```

### Verdicts

| Verdict | Trigger | Routable? | Meaning |
|---|---|---|---|
| `ALIVE_OK` | 2xx/3xx | yes | Working |
| `ALIVE_AUTH_BLOCKED` | 401/403/4xx | yes | Exists - supply auth |
| `RATE_LIMITED` | 429 | yes | Exists - back off |
| `DEGRADED` | 5xx | yes | Exists - transient error |
| `ABSENT` | 404/410 | no | Capability missing |
| `UNREACHABLE` | DNS/conn/timeout | no | Can't reach |

## License

MIT (c) Phan Van Bang
