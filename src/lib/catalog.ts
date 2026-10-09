import { getCollection, type CollectionEntry } from 'astro:content';

export interface CatalogSection {
	category: CollectionEntry<'categories'>;
	products: CollectionEntry<'products'>[];
}

// The only place the catalog grouping and sort rules live (spec 0005):
// categories by `order`, empty categories dropped; in-stock products first, then A–Z.
export async function getCatalog(): Promise<CatalogSection[]> {
	const categories = await getCollection('categories');
	const products = await getCollection('products');

	return categories
		.sort((a, b) => a.data.order - b.data.order)
		.map((category) => ({
			category,
			products: products
				.filter((product) => product.data.category.id === category.id)
				.sort(
					(a, b) =>
						Number(b.data.inStock) - Number(a.data.inStock) ||
						a.data.name.localeCompare(b.data.name, 'es'),
				),
		}))
		.filter((section) => section.products.length > 0);
}
