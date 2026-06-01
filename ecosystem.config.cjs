/**
 * PM2 process config for CommisApp Admin (Next.js).
 *
 * Two apps:
 *   - admin-dev  : APP_ENV=dev, port 3011, hits api-dev backend
 *   - admin-prod : APP_ENV=prod, port 3010, hits api (prod) backend
 *
 * Build before starting:
 *   pnpm install --frozen-lockfile
 *   pnpm build:dev     # for admin-dev
 *   pnpm build:prod    # for admin-prod
 *
 * Start:
 *   pm2 start ecosystem.config.cjs --only admin-prod
 *
 * Reload (graceful) after rebuild:
 *   pnpm build:prod && pm2 reload admin-prod
 *
 * Persist + boot:
 *   pm2 save && pm2 startup
 */

const path = require("path");

const cwd = __dirname;
const nextBin = path.join(cwd, "node_modules", "next", "dist", "bin", "next");

const baseApp = {
  script: nextBin,
  cwd,
  exec_mode: "fork",
  instances: 1,
  max_memory_restart: "1G",
  autorestart: true,
  watch: false,
  time: true,
  merge_logs: true,
  kill_timeout: 10000,
  wait_ready: false,
};

module.exports = {
  apps: [
    {
      ...baseApp,
      name: "admin-dev",
      args: "start -p 3011",
      env: {
        NODE_ENV: "production",
        APP_ENV: "dev",
        PORT: "3011",
      },
      error_file: "/root/.pm2/logs/admin-dev-error.log",
      out_file: "/root/.pm2/logs/admin-dev-out.log",
    },
    {
      ...baseApp,
      name: "admin-prod",
      args: "start -p 3010",
      env: {
        NODE_ENV: "production",
        APP_ENV: "prod",
        PORT: "3010",
      },
      error_file: "/root/.pm2/logs/admin-prod-error.log",
      out_file: "/root/.pm2/logs/admin-prod-out.log",
    },
  ],
};
