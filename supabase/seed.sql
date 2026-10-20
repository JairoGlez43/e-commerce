-- Sample catalog of spec 0004: 6 categories, 18 products (spec 0013).
-- Run once in the Supabase dashboard SQL editor, after schema.sql. Running it twice fails on the
-- primary keys on purpose: it is a one-time load. Photos: upload supabase/seed-photos/*.jpg to the
-- product-photos bucket with the same file names.

insert into public.categories (id, name, sort_order) values
  ('granos-y-pastas', 'Granos y pastas', 1),
  ('carnicos', 'Cárnicos', 2),
  ('despensa', 'Despensa', 3),
  ('lacteos-y-huevos', 'Lácteos y huevos', 4),
  ('bebidas', 'Bebidas', 5),
  ('aseo', 'Aseo', 6);

insert into public.products (id, name, category_id, price, unit, in_stock, description, photo_path) values
  ('arroz-blanco', 'Arroz blanco', 'granos-y-pastas', 280, '1 lb', true, 'Arroz blanco de grano largo, vendido por libra. Guárdelo en un recipiente cerrado, en un lugar fresco y seco.', 'arroz-blanco.jpg'),
  ('frijoles-negros', 'Frijoles negros', 'granos-y-pastas', 380, '1 lb', true, 'Frijoles negros secos, vendidos por libra. Déjelos en remojo la noche anterior para que se ablanden antes.', 'frijoles-negros.jpg'),
  ('espaguetis', 'Espaguetis', 'granos-y-pastas', 320, 'Paquete 500 g', true, 'Pasta seca tipo espagueti en paquete de 500 g. Se cocina en agua hirviendo con sal en unos 10 minutos.', 'espaguetis.jpg'),
  ('muslos-de-pollo', 'Muslos de pollo', 'carnicos', 3400, 'Caja 10 lb', true, 'Caja de 10 libras de muslos de pollo congelados. Manténgalos en el congelador y descongélelos en el refrigerador.', 'muslos-de-pollo.jpg'),
  ('picadillo-de-res', 'Picadillo de res', 'carnicos', 450, '1 lb', true, 'Carne de res molida, vendida por libra. Consérvela congelada y cocínela bien antes de consumir.', 'picadillo-de-res.jpg'),
  ('salchichas', 'Salchichas', 'carnicos', 650, 'Paquete 10 u', false, 'Paquete de 10 salchichas. Listas para hervir, freír o asar. Manténgalas refrigeradas.', 'salchichas.jpg'),
  ('aceite-de-girasol', 'Aceite de girasol', 'despensa', 950, '1 L', true, 'Botella de 1 litro de aceite de girasol para cocinar y freír. Guárdela tapada y lejos del calor.', 'aceite-de-girasol.jpg'),
  ('azucar-blanca', 'Azúcar blanca', 'despensa', 250, '1 lb', true, 'Azúcar blanca refinada, vendida por libra. Guárdela en un recipiente cerrado para evitar la humedad.', 'azucar-blanca.jpg'),
  ('pure-de-tomate', 'Puré de tomate', 'despensa', 300, 'Lata 400 g', true, 'Lata de 400 g de puré de tomate para salsas, arroces y guisos. Una vez abierta, consérvela en el refrigerador.', 'pure-de-tomate.jpg'),
  ('huevos', 'Huevos', 'lacteos-y-huevos', 3000, 'Cartón 30 u', true, 'Cartón de 30 huevos de gallina. Se conservan mejor en el refrigerador.', 'huevos.jpg'),
  ('leche-en-polvo', 'Leche en polvo', 'lacteos-y-huevos', 2800, 'Bolsa 1 kg', false, 'Bolsa de 1 kg de leche en polvo entera. Se prepara disolviéndola en agua; guárdela bien cerrada.', 'leche-en-polvo.jpg'),
  ('queso-gouda', 'Queso gouda', 'lacteos-y-huevos', 1500, '1 lb', true, 'Queso gouda amarillo, vendido por libra. Ideal para bocaditos y pizzas. Manténgalo refrigerado.', 'queso-gouda.jpg'),
  ('refresco-de-cola', 'Refresco de cola', 'bebidas', 200, 'Lata 355 ml', true, 'Lata de 355 ml de refresco de cola. Mejor servido frío.', 'refresco-de-cola.jpg'),
  ('cerveza-clara', 'Cerveza clara', 'bebidas', 240, 'Lata 355 ml', true, 'Lata de 355 ml de cerveza clara. Mejor servida fría.', 'cerveza-clara.jpg'),
  ('malta', 'Malta', 'bebidas', 220, 'Lata 355 ml', true, 'Lata de 355 ml de malta, bebida de cebada sin alcohol. Mejor servida fría.', 'malta.jpg'),
  ('jabon-de-bano', 'Jabón de baño', 'aseo', 180, 'Unidad', true, 'Pastilla de jabón de baño para uso diario.', 'jabon-de-bano.jpg'),
  ('detergente-en-polvo', 'Detergente en polvo', 'aseo', 900, 'Bolsa 1 kg', true, 'Bolsa de 1 kg de detergente en polvo para lavar ropa a mano o en lavadora.', 'detergente-en-polvo.jpg'),
  ('papel-higienico', 'Papel higiénico', 'aseo', 600, 'Paquete 4 u', true, 'Paquete de 4 rollos de papel higiénico.', 'papel-higienico.jpg');
