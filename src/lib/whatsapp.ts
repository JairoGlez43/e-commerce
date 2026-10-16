import type { CollectionEntry } from 'astro:content';
import { formatPrice } from './price';

// The only place that knows about WhatsApp (spec 0007).

// The number comes only from the environment (.env or the build command), never from code,
// so it is not published in the repo. A missing or malformed number stops the build.
export function getWhatsAppNumber(): string {
	const number = import.meta.env.WHATSAPP_NUMBER;
	if (!number || !/^\d{8,15}$/.test(number)) {
		throw new Error(
			'WHATSAPP_NUMBER must be set to 8–15 digits (international format, no +). See .env.example.',
		);
	}
	return number;
}

// Click-to-chat link with the message already typed: https://wa.me/<number>?text=<message>.
export function orderLink(product: CollectionEntry<'products'>, pageUrl: string): string {
	const { name, unit, price, inStock } = product.data;
	const message = inStock
		? `Hola, quiero pedir: ${name} (${unit}) – ${formatPrice(price)}.\n${pageUrl}`
		: `Hola, ¿cuándo vuelve a haber ${name} (${unit})?\n${pageUrl}`;
	return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

// General contact link for the header and footer, not about one product (spec 0010).
export function contactLink(): string {
	const message = 'Hola, tengo una pregunta sobre la tienda.';
	return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}
