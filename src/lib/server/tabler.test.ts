import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tabler icons', () => {
	it('stay a runtime dependency: /icons/<name>.svg reads them from node_modules', () => {
		const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
		expect(pkg.dependencies).toHaveProperty('@tabler/icons');
	});
});
