import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { photoUrl, readCatalogChangedAt, readCategories, readProducts } from './lib/supabase';

// Shapes decided in spec 0004; the data is read from Supabase at build (spec 0013).
// The loaders map the table columns back to that shape, and the schemas still validate every row.
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be lowercase kebab-case');

const categories = defineCollection({
	loader: async () =>
		(await readCategories()).map((row) => ({ id: row.id, name: row.name, order: row.sort_order })),
	schema: z.object({
		id: slug,
		name: z.string().min(1).max(30),
		order: z.number().int().nonnegative(),
	}),
});

const products = defineCollection({
	loader: async () =>
		(await readProducts()).map((row) => ({
			id: row.id,
			name: row.name,
			category: row.category_id,
			price: row.price,
			unit: row.unit,
			inStock: row.in_stock,
			description: row.description,
			photo: row.photo_path ? photoUrl(row.photo_path) : undefined,
		})),
	schema: z.object({
		id: slug,
		name: z.string().min(1).max(60),
		// Unknown ids are already refused in readProducts(); reference() alone would only log them.
		category: reference('categories'),
		price: z.number().int().positive(),
		unit: z.string().min(1).max(30),
		inStock: z.boolean(),
		description: z.string().min(1).max(300),
		// Remote photo, optimized at build by astro:assets (allowed in astro.config.mjs).
		// Optional since spec 0015: a product without one shows the NoPhoto box.
		photo: z.url().optional(),
	}),
});

// One entry: when the catalog last changed (spec 0016). /build.json copies it, and the admin
// compares it with the database's to show "Hay cambios sin publicar".
const catalogState = defineCollection({
	loader: async () => [{ id: 'current', changedAt: await readCatalogChangedAt() }],
	schema: z.object({
		changedAt: z.string().min(1),
	}),
});

export const collections = { categories, products, catalogState };
