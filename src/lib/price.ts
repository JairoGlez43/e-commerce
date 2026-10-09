// The one place the currency appears in code (spec 0004). Prices are integers in CUP.
const formatter = new Intl.NumberFormat('es-ES');

export function formatPrice(price: number): string {
	return `${formatter.format(price)} CUP`;
}
