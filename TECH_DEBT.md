# Tech Debt

## [TD-001] Production Docker image installs devDependencies at runtime

**Area:** `dockerfile` - `prod` target

**Why it exists:**
The project runs via `ts-node` with no compile step. `typescript` and `ts-node` are declared as `devDependencies` but are required at runtime. The prod target uses `npm ci --include=dev` to pull them in, which means the production image carries the full dev dependency tree.

**Proper resolution:**
Add a build step that compiles TypeScript to JavaScript, then run the output with `node` directly. The prod target would install only production dependencies (`npm ci --omit=dev`), resulting in a smaller and cleaner image.

**Introduced in:** `15fc7db` - chore(release): bump to 1.4.0 and configure production deployment
