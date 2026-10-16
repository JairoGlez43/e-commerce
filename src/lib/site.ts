// Shop identity, the one place to change it (spec 0005).
// Generic on purpose: the demo is shown to one business after another (spec 0009).
export const site = {
	name: 'Tienda de alimentos (demo)',
	description:
		'Productos en existencia y precios, siempre al día. Catálogo de demostración de una tienda local de alimentos.',
	// While this is a demo, every page asks search engines not to index it (spec 0008).
	// Set to true when the shop owner buys the site and wants it on Google.
	indexable: false,

	// Shop information shown on the home page, header and footer (spec 0010).
	// Demo values: a municipality, never a street address (spec 0009). A client who delivers
	// changes `delivery`, step 3 of `howToBuy` and the delivery answer in `faq`.
	location: 'La Lisa, La Habana',
	hours: [
		{ days: 'Lunes a sábado', time: '9:00 a.m. – 6:00 p.m.' },
		{ days: 'Domingo', time: '9:00 a.m. – 1:00 p.m.' },
	],
	payments: ['Efectivo (CUP)', 'Transfermóvil', 'EnZona', 'USD en efectivo'],
	pickup: 'Recoge tu pedido en la tienda, sin costo adicional.',
	delivery: 'Por ahora no hacemos entregas a domicilio.',
	howToBuy: [
		'Elige lo que quieres en el catálogo.',
		'Toca «Pedir por WhatsApp» y envía el mensaje.',
		'Te confirmamos el pedido y lo recoges en la tienda.',
	],
	faq: [
		{
			question: '¿Los precios están actualizados?',
			answer:
				'Sí. Cuando cambia un precio o se agota un producto, el catálogo se actualiza. Arriba ves la fecha de la última actualización.',
		},
		{
			question: '¿Cómo hago un pedido?',
			answer:
				'Abre el producto y toca «Pedir por WhatsApp». El mensaje ya lleva el nombre y el precio: solo tienes que enviarlo y te confirmamos.',
		},
		{
			question: '¿Cómo puedo pagar?',
			answer:
				'En efectivo, en CUP o USD, o por transferencia con Transfermóvil o EnZona, al recoger tu pedido.',
		},
		{
			question: '¿Hacen entregas a domicilio?',
			answer: 'Por ahora no. Puedes recoger tu pedido en la tienda, en La Lisa.',
		},
		{
			question: '¿Qué hago si un producto está agotado?',
			answer:
				'Abre el producto y toca «Preguntar por WhatsApp». Te avisamos cuando vuelva a haber.',
		},
	],
};
