/** Icon search over the Tabler index (English names and tags), with German words mapped to tags. */
export interface IconEntry {
	/** Tabler icon name, e.g. "shopping-cart" */
	n: string;
	/** Lowercased category and tags */
	t: string;
}

/** German search words → English Tabler terms. Matching is by prefix, so "kaffee" also covers "kaffeebecher". */
const GERMAN: Record<string, string> = {
	auto: 'car',
	arbeit: 'briefcase',
	baby: 'baby',
	bahn: 'train',
	berg: 'mountain',
	bier: 'beer',
	brot: 'bread',
	buch: 'book',
	bus: 'bus',
	camping: 'tent',
	einkauf: 'shopping-cart',
	einkaufen: 'shopping-cart',
	essen: 'tools-kitchen',
	fahrrad: 'bike',
	familie: 'users',
	feier: 'confetti',
	flug: 'plane',
	flugzeug: 'plane',
	freunde: 'users',
	fußball: 'ball-football',
	fussball: 'ball-football',
	garten: 'plant',
	geburtstag: 'cake',
	geld: 'cash',
	geschenk: 'gift',
	getränk: 'glass',
	gesundheit: 'heart-rate',
	handy: 'device-mobile',
	haus: 'home',
	hotel: 'bed',
	hund: 'dog',
	internet: 'wifi',
	kaffee: 'coffee',
	katze: 'cat',
	kino: 'movie',
	kleidung: 'shirt',
	konzert: 'music',
	kuchen: 'cake',
	liebe: 'heart',
	medizin: 'pill',
	meer: 'beach',
	miete: 'home',
	musik: 'music',
	paar: 'heart',
	pärchen: 'heart',
	party: 'confetti',
	putzen: 'spray',
	reise: 'luggage',
	reparatur: 'tool',
	restaurant: 'tools-kitchen',
	schule: 'school',
	spiel: 'device-gamepad',
	sport: 'ball',
	strand: 'beach',
	strom: 'bolt',
	studium: 'school',
	tanken: 'gas-station',
	taxi: 'car',
	tier: 'paw',
	urlaub: 'beach',
	versicherung: 'shield',
	wasser: 'droplet',
	wein: 'glass-full',
	wg: 'home',
	wohnung: 'building',
	zug: 'train'
};

function terms(query: string): string[] {
	return query
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => {
			const german = Object.keys(GERMAN).find((de) => de.startsWith(word) || word.startsWith(de));
			return german && word.length >= 3 ? GERMAN[german]! : word;
		});
}

/** Best matches first: exact name, name prefix, name contains, then tags. */
export function searchIcons(index: IconEntry[], query: string, limit = 36): string[] {
	const words = terms(query);
	if (!words.length) return [];
	const scored: { n: string; score: number }[] = [];
	for (const icon of index) {
		let score = 0;
		for (const w of words) {
			if (icon.n === w) score += 100;
			else if (icon.n.startsWith(w)) score += 40;
			else if (icon.n.includes(w)) score += 20;
			else if (icon.t.includes(w)) score += 10;
			else {
				score = 0;
				break;
			}
		}
		if (score) scored.push({ n: icon.n, score: score - icon.n.length / 100 });
	}
	return scored
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((s) => s.n);
}
