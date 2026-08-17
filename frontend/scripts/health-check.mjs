import process from "node:process";

const checks = [
	{ name: "Backend Flask", url: "http://127.0.0.1:8092/api/v1/health" },
	{ name: "Frontend Vite", url: "http://127.0.0.1:3005/" },
];

async function check({ name, url }) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 4000);
	try {
		const response = await fetch(url, { signal: controller.signal });
		return { name, ok: response.ok, status: response.status };
	} catch (error) {
		return {
			name,
			ok: false,
			status: error instanceof Error ? error.message : String(error),
		};
	} finally {
		clearTimeout(timeout);
	}
}

const results = await Promise.all(checks.map(check));
for (const result of results) {
	const marker = result.ok ? "OK" : "FALLO";
	console.log(`[${marker}] ${result.name}: ${result.status}`);
}

if (results.some((result) => !result.ok)) {
	console.error("Health falló: se esperan los puertos 8092 y 3005.");
	process.exitCode = 1;
}
