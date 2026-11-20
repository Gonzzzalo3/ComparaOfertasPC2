-- Catálogo público de promociones. Las preferencias personales se guardan solo en el dispositivo.
create table if not exists public.offers (
  id text primary key,
  chain text not null check (length(chain) between 2 and 80),
  product_name text not null check (length(product_name) between 2 and 160),
  brand text not null check (length(brand) between 1 and 100),
  category text not null check (length(category) between 2 and 80),
  presentation text not null check (length(presentation) between 2 and 120),
  unit text not null check (unit in ('g', 'ml', 'unidad')),
  unit_quantity numeric(12, 2) not null check (unit_quantity > 0),
  price numeric(10, 2) not null check (price > 0),
  original_price numeric(10, 2) check (original_price is null or original_price >= price),
  starts_at date not null,
  ends_at date not null check (ends_at >= starts_at),
  source_url text not null check (source_url ~ '^https://'),
  stock boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists offers_active_lookup on public.offers (ends_at, category, chain);
alter table public.offers enable row level security;
revoke all on public.offers from anon, authenticated;
grant select on public.offers to anon, authenticated;
drop policy if exists "Read current in-stock offers" on public.offers;
create policy "Read current in-stock offers" on public.offers
  for select to anon, authenticated
  using (stock and starts_at <= (now() at time zone 'America/Lima')::date
              and ends_at >= (now() at time zone 'America/Lima')::date);

insert into public.offers
(id, chain, product_name, brand, category, presentation, unit, unit_quantity, price, original_price, starts_at, ends_at, source_url, stock)
values
('demo-01','Mercado Sol','Leche evaporada entera','Andina','Lácteos','lata de 400 g','g',400,4.20,5.10,'2026-11-19','2026-11-30','https://example.com/ofertas/demo-01',true),
('demo-02','MaxiAhorro','Leche evaporada entera','Andina','Lácteos','pack de 6 × 400 g','g',2400,23.40,30.60,'2026-11-19','2026-11-30','https://example.com/ofertas/demo-02',true),
('demo-03','Tienda Uno','Leche evaporada entera','Andina','Lácteos','lata de 410 g','g',410,4.35,5.20,'2026-11-19','2026-11-27','https://example.com/ofertas/demo-03',true),
('demo-04','Mercado Sol','Aceite vegetal','Campo Claro','Abarrotes','botella de 1 L','ml',1000,8.90,10.50,'2026-11-19','2026-11-28','https://example.com/ofertas/demo-04',true),
('demo-05','MaxiAhorro','Aceite vegetal','Campo Claro','Abarrotes','botella de 900 ml','ml',900,7.49,9.20,'2026-11-19','2026-11-26','https://example.com/ofertas/demo-05',true),
('demo-06','Botica Central','Protector solar FPS 50','Solcare','Cuidado personal','frasco de 200 ml','ml',200,39.90,52.00,'2026-11-19','2026-11-25','https://example.com/ofertas/demo-06',true),
('demo-07','Tienda Uno','Protector solar FPS 50','Solcare','Cuidado personal','frasco de 180 ml','ml',180,35.50,45.00,'2026-11-19','2026-11-29','https://example.com/ofertas/demo-07',true),
('demo-08','Mercado Sol','Arroz extra','Valle Dorado','Abarrotes','bolsa de 5 kg','g',5000,18.50,22.90,'2026-11-19','2026-11-30','https://example.com/ofertas/demo-08',true),
('demo-09','MaxiAhorro','Arroz extra','Valle Dorado','Abarrotes','bolsa de 1 kg','g',1000,3.69,4.50,'2026-11-19','2026-11-30','https://example.com/ofertas/demo-09',true),
('demo-10','Botica Central','Shampoo hidratante','Raíz Viva','Cuidado personal','frasco de 400 ml','ml',400,16.90,21.00,'2026-11-19','2026-11-24','https://example.com/ofertas/demo-10',true),
('demo-11','Tienda Uno','Shampoo hidratante','Raíz Viva','Cuidado personal','frasco de 750 ml','ml',750,28.90,35.90,'2026-11-19','2026-11-30','https://example.com/ofertas/demo-11',true),
('demo-12','Mercado Sol','Café molido','Altura','Abarrotes','bolsa de 250 g','g',250,14.50,17.90,'2026-11-19','2026-11-30','https://example.com/ofertas/demo-12',true),
('demo-13','MaxiAhorro','Café molido','Altura','Abarrotes','bolsa de 500 g','g',500,26.90,33.00,'2026-11-19','2026-11-30','https://example.com/ofertas/demo-13',true),
('demo-14','Botica Central','Pañales talla M','Nube','Bebés','paquete de 40 unidades','unidad',40,32.90,39.90,'2026-11-19','2026-11-30','https://example.com/ofertas/demo-14',true)
on conflict (id) do update set
  price = excluded.price, original_price = excluded.original_price,
  starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  source_url = excluded.source_url, stock = excluded.stock;
