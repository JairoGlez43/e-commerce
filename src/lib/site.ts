// Shop identity, the one place to change it (spec 0005).
// Generic on purpose: the demo is shown to one business after another (spec 0009).
export const site = {
	name: 'Tienda de alimentos (demo)',
	description:
		'Productos en existencia y precios, siempre al día. Catálogo de demostración de una tienda local de alimentos.',
	// While this is a demo, every page asks search engines not to index it (spec 0008).
	// Set to true when the shop owner buys the site and wants it on Google.
	indexable: false,
};
