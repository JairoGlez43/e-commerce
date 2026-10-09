import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { file } from 'astro/loaders';
import categoryData from './data/categories.json';

// Shapes decided in spec 0004. Real owner-editable data must match them later.
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be lowercase kebab-case');

// reference() alone only logs an unknown id and the build still exits 0,
// so the id is checked here first, where a schema error fails the build.
const categoryIds = categoryData.map((category) => category.id);

const categories = defineCollection({
	loader: file('src/data/categories.json'),
	schema: z.object({
		id: slug,
		name: z.string().min(1).max(30),
		order: z.number().int().nonnegative(),
	}),
});

const products = defineCollection({
	loader: file('src/data/products.json'),
	schema: ({ image }) =>
		z.object({
			id: slug,
			name: z.string().min(1).max(60),
			category: z
				.string()
				.refine((id) => categoryIds.includes(id), { message: 'unknown category id' })
				.pipe(reference('categories')),
			price: z.number().int().positive(),
			unit: z.string().min(1).max(30),
			inStock: z.boolean(),
			description: z.string().min(1).max(300),
			photo: image(),
		}),
});

export const collections = { categories, products };
