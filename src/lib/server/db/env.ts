/** Server-Env, nutzbar in SvelteKit und im Worker (daher process.env statt $env). */
export function env(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`Umgebungsvariable ${name} fehlt`);
	return v;
}

export function optionalEnv(name: string): string | undefined {
	return process.env[name] || undefined;
}
