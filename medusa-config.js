const { loadEnv, defineConfig } = require("@medusajs/framework/utils")

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const cookieSecure = (process.env.COOKIE_SECURE || "false").toLowerCase() === "true"
const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL || "/"
const localFileBackendUrl =
	process.env.MEDUSA_FILE_BACKEND_URL || `${medusaBackendUrl.replace(/\/$/, "")}/static`

module.exports = defineConfig({
	admin: {
		backendUrl: medusaBackendUrl,
		vite: () => {
			return {
				server: {
					host: "0.0.0.0",
					allowedHosts: ["localhost", ".localhost", "127.0.0.1"],
					hmr: {
						port: 5173,
						clientPort: 5173,
					},
				},
			}
		},
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
	},
	modules: [
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