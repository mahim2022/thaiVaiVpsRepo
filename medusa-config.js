const { loadEnv, defineConfig } = require("@medusajs/framework/utils")

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const cookieSecure = (process.env.COOKIE_SECURE || "false").toLowerCase() === "true"
const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL || "/"
const localFileBackendUrl =
	process.env.MEDUSA_FILE_BACKEND_URL || `${medusaBackendUrl.replace(/\/$/, "")}/static`
const adminAllowedHosts = (process.env.ADMIN_ALLOWED_HOSTS || "")
	.split(",")
	.map((host) => host.trim())
	.filter(Boolean)
const isDevelopment = (process.env.NODE_ENV || "development") === "development"

module.exports = defineConfig({
	admin: {
		backendUrl: medusaBackendUrl,
		...(isDevelopment
			? {
					vite: () => {
						return {
							server: {
								host: "0.0.0.0",
								allowedHosts: [
									"localhost",
									".localhost",
									"127.0.0.1",
									"summithire.tech",
									"www.summithire.tech",
									...adminAllowedHosts,
								],
								hmr: {
									port: 5173,
									clientPort: 5173,
								},
							},
						}
					},
			  }
			: {}),
	},

	projectConfig: {
		databaseUrl: process.env.DATABASE_URL,
		cookieOptions: {
			secure: cookieSecure,
			sameSite: "lax",
			httpOnly: true,
		},
		http: {
			storeCors: process.env.STORE_CORS,
			adminCors: process.env.ADMIN_CORS,
			authCors: process.env.AUTH_CORS,
			jwtSecret: process.env.JWT_SECRET || "supersecret",
			cookieSecret: process.env.COOKIE_SECRET || "supersecret",
		},
		databaseDriverOptions: {
			ssl: false,
			sslmode: "disable",
		},
		eventBus: {
			resolve: "@medusajs/event-bus-redis",
			options: {
				redisUrl: process.env.REDIS_URL || "redis://redis:6379",
			},
		},
	},
	modules: [
		{
			resolve: "./src/modules/custom-order/index.js",
		},
		// Use distributed locking (PostgreSQL) to avoid in-memory lock contention under concurrency
		{
			resolve: "@medusajs/locking",
			options: {
				provider: {
					resolve: "@medusajs/locking-postgres",
					options: {
						acquireTimeoutMs: Number(process.env.LOCK_ACQUIRE_TIMEOUT_MS || 10000),
						lockTtlMs: Number(process.env.LOCK_TTL_MS || 30000),
					},
				},
			},
		},
		{
			resolve: "@medusajs/file",
			key: "file",
			options: {
				providers: [
					{
						resolve: "@medusajs/medusa/file-local",
						id: "local",
						options: {
							backend_url: localFileBackendUrl,
						},
					},
				],
			},
		},
	],
})