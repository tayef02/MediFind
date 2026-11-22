create table public.areas (
  id   bigint generated always as identity primary key,
  name text not null unique
);

create table public.categories (
  id   bigint generated always as identity primary key,
  name text not null unique
);

create table public.companies (
  id   bigint generated always as identity primary key,
  name text not null unique
);

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'pharmacy')),
  full_name  text not null,
  phone      text,
  address    text,
  area_id    bigint references public.areas(id),
  created_at timestamptz not null default now()
);

create table public.pharmacies (
  id         uuid primary key references public.profiles(id) on delete cascade,
  name       text not null,
  license_no text not null unique,
  area_id    bigint references public.areas(id),
  address    text not null,
  phone      text,
  open_time  time default '09:00',
  close_time time default '22:00',
  created_at timestamptz not null default now()
);

create table public.medicines (
  id           bigint generated always as identity primary key,
  name         text not null,
  generic_name text,
  category_id  bigint references public.categories(id),
  company_id   bigint references public.companies(id),
  unit         text not null default 'tablet'
               check (unit in ('tablet', 'capsule', 'bottle', 'tube', 'packet', 'inhaler', 'piece')),
  strip_size   int check (strip_size > 0),
  box_size     int check (box_size > 0),
  box_name     text not null default 'box' check (box_name in ('box', 'container', 'jar')),
  pack_info    text,
  created_at   timestamptz not null default now()
);
create unique index medicines_name_unique on public.medicines (lower(name));

create table public.stock (
  id                  bigint generated always as identity primary key,
  pharmacy_id         uuid   not null references public.pharmacies(id) on delete cascade,
  medicine_id         bigint not null references public.medicines(id) on delete cascade,
  quantity            int    not null default 0 check (quantity >= 0),
  cost_price          numeric(12,4) not null default 0 check (cost_price >= 0),
  price               numeric(12,4) not null check (price >= 0),
  expiry_date         date,
  low_stock_threshold int    not null default 50 check (low_stock_threshold >= 0),
  sell_loose          boolean not null default true,
  sell_strip          boolean not null default true,
  sell_box            boolean not null default true,
  updated_at          timestamptz not null default now(),
  unique (pharmacy_id, medicine_id)
);

create table public.cart_items (
  id         bigint generated always as identity primary key,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  stock_id   bigint not null references public.stock(id) on delete cascade,
  quantity   int    not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, stock_id)
);

create table public.orders (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  pharmacy_id      uuid not null references public.pharmacies(id) on delete cascade,
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'delivered', 'rejected')),
  delivery_address text not null,
  phone            text,
  note             text,
  total            numeric(10,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.order_items (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references public.orders(id) on delete cascade,
  stock_id      bigint references public.stock(id) on delete set null,
  medicine_id   bigint references public.medicines(id) on delete set null,
  medicine_name text   not null,
  quantity      int    not null check (quantity > 0),
  unit_price    numeric(12,4) not null,
  unit_cost     numeric(12,4) not null default 0
);

create table public.order_status_history (
  id         bigint generated always as identity primary key,
  order_id   bigint not null references public.orders(id) on delete cascade,
  status     text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index on public.stock (pharmacy_id);
create index on public.stock (medicine_id);
create index on public.cart_items (user_id);
create index on public.orders (user_id);
create index on public.orders (pharmacy_id, status);
create index on public.order_items (order_id);
create index on public.order_status_history (order_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := new.raw_user_meta_data;
  area bigint := nullif(meta->>'area_id', '')::bigint;
begin
  insert into profiles (id, role, full_name, phone, address, area_id)
  values (new.id, coalesce(meta->>'role', 'user'), coalesce(meta->>'full_name', ''),
          nullif(meta->>'phone', ''), nullif(meta->>'address', ''), area);

  if meta->>'role' = 'pharmacy' then
    insert into pharmacies (id, name, license_no, area_id, address, phone)
    values (new.id, meta->>'pharmacy_name', meta->>'license_no', area,
            meta->>'address', nullif(meta->>'phone', ''));
  end if;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.fill_order_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s record;
  o record;
begin
  select st.*, m.name as med_name into s
  from stock st join medicines m on m.id = st.medicine_id
  where st.id = new.stock_id;
  if not found then
    raise exception 'Stock item not found';
  end if;

  select * into o from orders where id = new.order_id;
  if s.pharmacy_id <> o.pharmacy_id then
    raise exception 'This medicine does not belong to the order''s pharmacy';
  end if;
  if s.quantity < new.quantity then
    raise exception 'Only % left of %', s.quantity, s.med_name;
  end if;

  new.medicine_id   := s.medicine_id;
  new.medicine_name := s.med_name;
  new.unit_price    := s.price;
  new.unit_cost     := s.cost_price;
  return new;
end; $$;

create trigger order_item_fill
  before insert on public.order_items
  for each row execute function public.fill_order_item();

create or replace function public.recalc_order_total()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update orders
     set total = (select coalesce(sum(quantity * unit_price), 0)
                  from order_items where order_id = new.order_id)
   where id = new.order_id;
  return null;
end; $$;

create trigger order_item_total
  after insert on public.order_items
  for each row execute function public.recalc_order_total();

create or replace function public.handle_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  it record;
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
       (old.status = 'pending'   and new.status in ('confirmed', 'rejected'))
    or (old.status = 'confirmed' and new.status = 'delivered')
  ) then
    raise exception 'Invalid status change: % -> %', old.status, new.status;
  end if;

  if new.status = 'confirmed' then
    for it in select * from order_items where order_id = new.id loop
      update stock
         set quantity = quantity - it.quantity, updated_at = now()
       where id = it.stock_id and quantity >= it.quantity;
      if not found then
        raise exception 'Not enough stock for %', it.medicine_name;
      end if;
    end loop;
  end if;

  new.updated_at := now();
  return new;
end; $$;

create trigger order_status_change
  before update on public.orders
  for each row execute function public.handle_order_status();

create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status <> old.status then
    insert into order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return null;
end; $$;

create trigger order_status_log
  after insert or update on public.orders
  for each row execute function public.log_order_status();

create or replace function public.is_pharmacy()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pharmacies where id = auth.uid());
$$;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, delete on all tables in schema public to authenticated;
grant update on public.stock, public.cart_items to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.areas                enable row level security;
alter table public.categories           enable row level security;
alter table public.companies            enable row level security;
alter table public.profiles             enable row level security;
alter table public.pharmacies           enable row level security;
alter table public.medicines            enable row level security;
alter table public.stock                enable row level security;
alter table public.cart_items           enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;

create policy "areas: read" on public.areas for select using (true);
create policy "categories: read" on public.categories for select using (true);
create policy "companies: read" on public.companies for select using (true);

create policy "profiles: read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant  update (full_name, phone, address, area_id) on public.profiles to authenticated;

create policy "pharmacies: read" on public.pharmacies
  for select to authenticated using (true);
create policy "pharmacies: update own" on public.pharmacies
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant  update (name, area_id, address, phone, open_time, close_time) on public.pharmacies to authenticated;

create policy "medicines: read" on public.medicines
  for select to authenticated using (true);
create policy "medicines: pharmacy insert" on public.medicines
  for insert to authenticated with check (public.is_pharmacy());

create policy "stock: read" on public.stock
  for select to authenticated using (true);
create policy "stock: own insert" on public.stock
  for insert to authenticated with check (pharmacy_id = auth.uid());
create policy "stock: own update" on public.stock
  for update to authenticated using (pharmacy_id = auth.uid()) with check (pharmacy_id = auth.uid());
create policy "stock: own delete" on public.stock
  for delete to authenticated using (pharmacy_id = auth.uid());

create policy "cart: own" on public.cart_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "orders: read own" on public.orders
  for select to authenticated using (user_id = auth.uid() or pharmacy_id = auth.uid());
create policy "orders: user insert" on public.orders
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending' and not public.is_pharmacy());
create policy "orders: pharmacy update" on public.orders
  for update to authenticated using (pharmacy_id = auth.uid()) with check (pharmacy_id = auth.uid());
grant  update (status) on public.orders to authenticated;

create policy "order_items: read" on public.order_items
  for select to authenticated using (
    exists (select 1 from orders o where o.id = order_id
            and (o.user_id = auth.uid() or o.pharmacy_id = auth.uid()))
  );
create policy "order_items: user insert" on public.order_items
  for insert to authenticated with check (
    exists (select 1 from orders o where o.id = order_id
            and o.user_id = auth.uid() and o.status = 'pending')
  );

create policy "history: read" on public.order_status_history
  for select to authenticated using (
    exists (select 1 from orders o where o.id = order_id
            and (o.user_id = auth.uid() or o.pharmacy_id = auth.uid()))
  );
create or replace function public.place_order(p_pharmacy uuid, p_address text, p_phone text, p_note text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  new_id bigint;
  item record;
begin
  if auth.uid() is null or is_pharmacy() then
    raise exception 'Only users can place orders';
  end if;

  if not exists (
    select 1 from cart_items c join stock s on s.id = c.stock_id
    where c.user_id = auth.uid() and s.pharmacy_id = p_pharmacy
  ) then
    raise exception 'Cart is empty for this pharmacy';
  end if;

  insert into orders (user_id, pharmacy_id, delivery_address, phone, note)
  values (auth.uid(), p_pharmacy, p_address, nullif(p_phone, ''), nullif(p_note, ''))
  returning id into new_id;

  for item in
    select c.stock_id, c.quantity from cart_items c join stock s on s.id = c.stock_id
    where c.user_id = auth.uid() and s.pharmacy_id = p_pharmacy
  loop
    insert into order_items (order_id, stock_id, quantity) values (new_id, item.stock_id, item.quantity);
  end loop;

  delete from cart_items c using stock s
  where s.id = c.stock_id and c.user_id = auth.uid() and s.pharmacy_id = p_pharmacy;

  return new_id;
end; $$;

grant execute on function public.place_order(uuid, text, text, text) to authenticated;
