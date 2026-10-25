/** Server env, usable in SvelteKit and in the worker (hence process.env instead of $env). */
export function env(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`Environment variable ${name} is missing`);
	return v;
}

export function optionalEnv(name: string): string | undefined {
	return process.env[name] || undefined;
}
