# Tech Debt

## [TD-001] Production Docker image installs devDependencies at runtime

**Area:** `dockerfile` - `prod` target

**Why it exists:**
The project runs via `ts-node` with no compile step. `typescript` and `ts-node` are declared as `devDependencies` but are required at runtime. The prod target uses `npm ci --include=dev` to pull them in, which means the production image carries the full dev dependency tree.

**Proper resolution:**
Add a build step that compiles TypeScript to JavaScript, then run the output with `node` directly. The prod target would install only production dependencies (`npm ci --omit=dev`), resulting in a smaller and cleaner image.

**Introduced in:** `15fc7db` - chore(release): bump to 1.4.0 and configure production deployment

---

## [TD-002] Auth server rate limiting deferred on deployment context assumption

**Area:** `bot/auth/auth.server.ts`

**Why it exists:**
GitHub Advanced Security raised a rate limiting finding against the `/auth` and `/revoke` endpoints. The finding was accepted as low risk and no mitigation was added because the auth server is locally hosted - port 8090 is only reachable from the host machine. The only party that could abuse the endpoint is the operator.

**Condition that would reopen this:**
Any deployment change that exposes port 8090 beyond the local machine - public cloud hosting, port forwarding through a router, or any configuration that puts the auth server on the open internet - invalidates this assumption. Rate limiting middleware (e.g. `express-rate-limit`) should be added at that point.

**Accepted in:** `fix(auth): use root option on sendFile to resolve CodeQL path traversal finding`
