insert into public.areas (name) values
  ('Zindabazar'), ('Amberkhana'), ('Dargah Gate'), ('Bondor Bazar'), ('Subidbazar'), ('Tilagor'), ('Uposhohor'),
  ('Chowhatta'), ('Mirabazar'), ('Shibganj'), ('Akhalia'), ('Kumarpara'), ('Lamabazar'), ('Pathantula')
on conflict (name) do nothing;

insert into public.categories (name) values
  ('Pain and Fever'), ('Gastric'), ('Allergy'), ('Antibiotic'), ('Heart and BP'), ('Diabetes'),
  ('Vitamin'), ('Thyroid'), ('Skin Care'), ('Respiratory'), ('Others')
on conflict (name) do nothing;

insert into public.companies (name) values
  ('Square'), ('Beximco'), ('Incepta'), ('Renata'), ('Eskayef'), ('Healthcare'), ('Acme'),
  ('ACI'), ('SMC'), ('GSK'), ('Sanofi'), ('Opsonin')
on conflict (name) do nothing;

drop table if exists demo_meds;
create temp table demo_meds (name text, generic text, unit text, strip_size int, box_size int, pack text, cost numeric, category text, company text);

insert into demo_meds values
  ('Napa 500mg',              'Paracetamol',                               'tablet',  10,   500,  null,            9.00, 'Pain and Fever', 'Beximco'),
  ('Napa Extra',              'Paracetamol + Caffeine',                    'tablet',  10,   240,  null,           20.00, 'Pain and Fever', 'Beximco'),
  ('Ace 500mg',               'Paracetamol',                               'tablet',  10,   500,  null,            9.00, 'Pain and Fever', 'Square'),
  ('Ace Plus',                'Paracetamol + Caffeine',                    'tablet',  10,   240,  null,           20.00, 'Pain and Fever', 'Square'),
  ('Seclo 20mg',              'Omeprazole',                                'capsule', 10,   60,   null,           45.00, 'Gastric', 'Square'),
  ('Losectil 20mg',           'Omeprazole',                                'capsule', 10,   60,   null,           45.00, 'Gastric', 'Eskayef'),
  ('Sergel 20mg',             'Esomeprazole',                              'capsule', 10,   60,   null,           60.00, 'Gastric', 'Healthcare'),
  ('Maxpro 20mg',             'Esomeprazole',                              'tablet',  10,   50,   null,           60.00, 'Gastric', 'Renata'),
  ('Pantonix 20mg',           'Pantoprazole',                              'tablet',  10,   50,   null,           50.00, 'Gastric', 'Incepta'),
  ('Fexo 120mg',              'Fexofenadine',                              'tablet',  10,   50,   null,           70.00, 'Allergy', 'Square'),
  ('Alatrol 10mg',            'Cetirizine',                                'tablet',  10,   100,  null,           25.00, 'Allergy', 'Square'),
  ('Deslor 5mg',              'Desloratadine',                             'tablet',  10,   50,   null,           40.00, 'Allergy', 'Incepta'),
  ('Monas 10mg',              'Montelukast',                               'tablet',  10,   30,   null,          130.00, 'Respiratory', 'Acme'),
  ('Zimax 500mg',             'Azithromycin',                              'tablet',  6,    12,   null,          190.00, 'Antibiotic', 'Square'),
  ('Azithrocin 500mg',        'Azithromycin',                              'tablet',  6,    12,   null,          190.00, 'Antibiotic', 'Beximco'),
  ('Cef-3 200mg',             'Cefixime',                                  'capsule', 6,    12,   null,          180.00, 'Antibiotic', 'Square'),
  ('Moxacil 500mg',           'Amoxicillin',                               'capsule', 10,   100,  null,           70.00, 'Antibiotic', 'Square'),
  ('Flagyl 400mg',            'Metronidazole',                             'tablet',  10,   200,  null,           15.00, 'Antibiotic', 'Sanofi'),
  ('Ciprocin 500mg',          'Ciprofloxacin',                             'tablet',  10,   50,   null,          120.00, 'Antibiotic', 'Square'),
  ('Antacid Plus',            'Aluminium Hydroxide + Magnesium Hydroxide', 'tablet',  10,   200,  null,           10.00, 'Gastric', 'Opsonin'),
  ('Entacyd Plus',            'Aluminium Hydroxide + Magnesium Hydroxide', 'tablet',  10,   200,  null,           12.00, 'Gastric', 'Square'),
  ('Domperon 10mg',           'Domperidone',                               'tablet',  10,   100,  null,           25.00, 'Gastric', 'Acme'),
  ('Emistat 8mg',             'Ondansetron',                               'tablet',  10,   50,   null,          100.00, 'Gastric', 'Incepta'),
  ('Tufnil 200mg',            'Tolfenamic Acid',                           'tablet',  10,   50,   null,           70.00, 'Pain and Fever', 'Eskayef'),
  ('Rolac 10mg',              'Ketorolac',                                 'tablet',  10,   50,   null,           80.00, 'Pain and Fever', 'Renata'),
  ('Ecosprin 75mg',           'Aspirin',                                   'tablet',  14,   280,  null,            8.00, 'Heart and BP', 'Acme'),
  ('Osartil 50mg',            'Losartan Potassium',                        'tablet',  10,   50,   null,           70.00, 'Heart and BP', 'Incepta'),
  ('Amdocal 5mg',             'Amlodipine',                                'tablet',  10,   50,   null,           40.00, 'Heart and BP', 'Beximco'),
  ('Bislol 2.5mg',            'Bisoprolol',                                'tablet',  10,   50,   null,           50.00, 'Heart and BP', 'Healthcare'),
  ('Comet 500mg',             'Metformin',                                 'tablet',  10,   100,  null,           35.00, 'Diabetes', 'Square'),
  ('Secrin 2mg',              'Glimepiride',                               'tablet',  10,   50,   null,           60.00, 'Diabetes', 'Healthcare'),
  ('Rosuva 10mg',             'Rosuvastatin',                              'tablet',  10,   30,   null,          120.00, 'Heart and BP', 'Square'),
  ('Neuro-B',                 'Vitamin B1 + B6 + B12',                     'tablet',  10,   100,  null,           70.00, 'Vitamin', 'Square'),
  ('Ceevit 250mg',            'Vitamin C',                                 'tablet',  10,   200,  null,           15.00, 'Vitamin', 'Square'),
  ('Zinc 20mg',               'Zinc Sulphate',                             'tablet',  10,   100,  null,           15.00, 'Vitamin', 'Opsonin'),
  ('Histacin 4mg',            'Chlorpheniramine',                          'tablet',  10,   250,  null,            4.00, 'Allergy', 'Opsonin'),
  ('Thyrox 50mcg',            'Levothyroxine',                             'tablet',  null, 100,  null,            1.50, 'Thyroid', 'Renata'),
  ('Calbo-D',                 'Calcium + Vitamin D3',                      'bottle',  null, null, '30 tablets',  240.00, 'Vitamin', 'Square'),
  ('Napa Syrup',              'Paracetamol',                               'bottle',  null, null, '60 ml',        30.00, 'Pain and Fever', 'Beximco'),
  ('Ace Syrup',               'Paracetamol',                               'bottle',  null, null, '60 ml',        30.00, 'Pain and Fever', 'Square'),
  ('Alatrol Syrup',           'Cetirizine',                                'bottle',  null, null, '60 ml',        40.00, 'Allergy', 'Square'),
  ('Fexo Syrup',              'Fexofenadine',                              'bottle',  null, null, '50 ml',        70.00, 'Allergy', 'Square'),
  ('Entacyd Plus Suspension', 'Aluminium Hydroxide + Magnesium Hydroxide', 'bottle',  null, null, '200 ml',       85.00, 'Gastric', 'Square'),
  ('Zimax Suspension',        'Azithromycin',                              'bottle',  null, null, '15 ml',       110.00, 'Antibiotic', 'Square'),
  ('Savlon Liquid 100ml',     'Chloroxylenol',                             'bottle',  null, null, '100 ml',       60.00, 'Skin Care', 'ACI'),
  ('Orsaline-N',              'Oral Rehydration Salts',                    'packet',  null, null, '20 g',       5.00, 'Others', 'SMC'),
  ('Burnol Cream',            'Aminacrine',                                'tube',    null, null, '20 g',         45.00, 'Skin Care', 'Opsonin'),
  ('Ventolin Inhaler',        'Salbutamol',                                'inhaler', null, null, '200 puffs',   280.00, 'Respiratory', 'GSK');

insert into public.medicines (name, generic_name, category_id, company_id, unit, strip_size, box_size, pack_info)
select d.name, d.generic, c.id, co.id, d.unit, d.strip_size, d.box_size, d.pack
from demo_meds d
join public.categories c on c.name = d.category
join public.companies co on co.name = d.company
on conflict ((lower(name))) do update
  set category_id = excluded.category_id, company_id = excluded.company_id, unit = excluded.unit,
      strip_size = excluded.strip_size, box_size = excluded.box_size, pack_info = excluded.pack_info;

update public.medicines set box_name = 'container' where name = 'Thyrox 50mcg';

create or replace function pg_temp.demo_user(p_email text, p_meta jsonb)
returns uuid language plpgsql as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = p_email;
  if uid is not null then
    return uid;
  end if;

  uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', p_email,
    extensions.crypt('123456', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', p_meta, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
          jsonb_build_object('sub', uid::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());

  return uid;
end; $$;

select pg_temp.demo_user(p.email, jsonb_build_object(
  'role', 'pharmacy', 'full_name', p.owner, 'phone', p.phone, 'address', p.address,
  'pharmacy_name', p.pharmacy, 'license_no', p.license, 'area_id', a.id::text))
from (values
  ('zindabazar.pharmacy@example.com', 'Zindabazar Pharmacy',       'Abdul Karim',      '01711000101', 'Shop 12, Zindabazar Main Road, Sylhet', 'DL-SYL-2019-0412', 'Zindabazar'),
  ('amberkhana.drug@example.com',     'Amberkhana Drug House',     'Rafiqul Islam',    '01712000202', 'Amberkhana Point, Sylhet',              'DL-SYL-2020-0577', 'Amberkhana'),
  ('shahjalal.medicine@example.com',  'Shahjalal Medicine Corner', 'Jamal Uddin',      '01713000303', 'Dargah Gate, Sylhet',                   'DL-SYL-2018-0239', 'Dargah Gate'),
  ('bondorbazar.pharma@example.com',  'Bondor Bazar Pharma',       'Shafiqul Haque',   '01714000404', 'Bondor Bazar, Sylhet',                  'DL-SYL-2021-0688', 'Bondor Bazar'),
  ('subidbazar.health@example.com',   'Subidbazar Health Care',    'Moinul Hasan',     '01715000505', 'Subidbazar, Airport Road, Sylhet',      'DL-SYL-2020-0731', 'Subidbazar'),
  ('tilagor.medical@example.com',     'Tilagor Medical Store',     'Nazmul Ahmed',     '01716000606', 'Tilagor Point, Sylhet',                 'DL-SYL-2022-0815', 'Tilagor'),
  ('uposhohor.pharmacy@example.com',  'Uposhohor Pharmacy',        'Kamrul Chowdhury', '01717000707', 'Block B, Uposhohor, Sylhet',            'DL-SYL-2019-0456', 'Uposhohor'),
  ('chowhatta.drug@example.com',      'Chowhatta Drug Center',     'Saiful Alam',      '01718000808', 'Chowhatta, Sylhet',                     'DL-SYL-2021-0902', 'Chowhatta')
) as p(email, pharmacy, owner, phone, address, license, area)
join public.areas a on a.name = p.area;

select pg_temp.demo_user(u.email, jsonb_build_object(
  'role', 'user', 'full_name', u.full_name, 'phone', u.phone, 'address', u.address, 'area_id', a.id::text))
from (values
  ('tanvir@example.com',  'Tanvir Ahmed',     '01819000111', 'House 7, Road 3, Mirabazar, Sylhet', 'Mirabazar'),
  ('nusrat@example.com',  'Nusrat Jahan',     '01819000222', 'House 22, Shibganj, Sylhet',         'Shibganj'),
  ('farhan@example.com',  'Farhan Chowdhury', '01819000333', 'Akhalia Main Road, Sylhet',          'Akhalia'),
  ('sumaiya@example.com', 'Sumaiya Akter',    '01819000444', 'Kumarpara, Sylhet',                  'Kumarpara'),
  ('rakib@example.com',   'Rakib Hasan',      '01819000555', 'Lamabazar, Sylhet',                  'Lamabazar'),
  ('mahmuda@example.com', 'Mahmuda Begum',    '01819000666', 'Pathantula, Sylhet',                 'Pathantula')
) as u(email, full_name, phone, address, area)
join public.areas a on a.name = u.area;

insert into public.stock (pharmacy_id, medicine_id, quantity, cost_price, price, expiry_date, low_stock_threshold, sell_loose, sell_strip, sell_box)
select
  p.id,
  m.id,
  k.pack * case when random() < 0.12 then 1 + floor(random() * 4)::int
                else 15 + floor(random() * 120)::int end,
  round(c.cost / k.pack, 4),
  round(round(c.cost * (1.12 + random() * 0.13)::numeric, 2) / k.pack, 4),
  case when random() < 0.08 then current_date + (5 + floor(random() * 24)::int)
       else current_date + (60 + floor(random() * 640)::int) end,
  5 * k.pack,
  random() < 0.85,
  true,
  random() < 0.6
from public.pharmacies p
join auth.users a on a.id = p.id and a.email like '%@example.com'
cross join demo_meds d
join public.medicines m on lower(m.name) = lower(d.name)
cross join lateral (select coalesce(d.strip_size, 1) as pack) k
cross join lateral (select round(d.cost * (0.95 + random() * 0.10)::numeric, 2) as cost) c
where random() < 0.75
  and not exists (select 1 from public.stock s where s.pharmacy_id = p.id)
on conflict (pharmacy_id, medicine_id) do nothing;

do $$
declare
  usr     record;
  ph_id   uuid;
  st      record;
  oid     bigint;
  n       int;
  r       float8;
  created timestamptz;
begin
  if exists (select 1 from public.orders o join auth.users a on a.id = o.user_id
             where a.email like '%@example.com') then
    raise notice 'Demo orders already exist, skipping.';
    return;
  end if;

  for i in 1..60 loop
    select p.* into usr
    from public.profiles p join auth.users a on a.id = p.id
    where p.role = 'user' and a.email like '%@example.com'
    order by random() limit 1;

    select s.pharmacy_id into ph_id
    from public.stock s join public.medicines m on m.id = s.medicine_id
    where s.quantity >= 10 * coalesce(m.strip_size, 1)
    group by s.pharmacy_id order by random() limit 1;

    r := random();
    created := case
      when r < 0.65 then now() - random() * interval '75 days'
      when r < 0.78 then now() - random() * interval '3 days'
      when r < 0.90 then now() - random() * interval '60 days'
      else               now() - random() * interval '1 day'
    end;

    insert into public.orders (user_id, pharmacy_id, delivery_address, phone, created_at, updated_at)
    values (usr.id, ph_id, usr.address, usr.phone, created, created)
    returning id into oid;

    n := 0;
    for st in
      select s.id, m.strip_size
      from public.stock s join public.medicines m on m.id = s.medicine_id
      where s.pharmacy_id = ph_id and s.quantity >= 10 * coalesce(m.strip_size, 1)
      order by random() limit (1 + floor(random() * 3))::int
    loop
      insert into public.order_items (order_id, stock_id, quantity)
      values (oid, st.id,
        case when st.strip_size is not null and random() < 0.3
             then 1 + floor(random() * (st.strip_size - 1))::int
             else (1 + floor(random() * 3)::int) * coalesce(st.strip_size, 1)
        end);
      n := n + 1;
    end loop;

    if n = 0 then
      delete from public.orders where id = oid;
      continue;
    end if;

    if r < 0.65 then
      update public.orders set status = 'confirmed' where id = oid;
      update public.orders set status = 'delivered' where id = oid;
    elsif r < 0.78 then
      update public.orders set status = 'confirmed' where id = oid;
    elsif r < 0.90 then
      update public.orders set status = 'rejected' where id = oid;
    end if;

    if r < 0.90 then
      update public.orders set updated_at = least(created + interval '1 day', now()) where id = oid;
    end if;
    update public.order_status_history set changed_at = created where order_id = oid and status = 'pending';
    update public.order_status_history set changed_at = least(created + interval '1 day', now()) where order_id = oid and status <> 'pending';
  end loop;
end $$;

select
  (select count(*) from public.areas)                as areas,
  (select count(*) from public.categories)           as categories,
  (select count(*) from public.companies)            as companies,
  (select count(*) from public.pharmacies)           as pharmacies,
  (select count(*) from public.profiles where role = 'user') as users,
  (select count(*) from public.medicines)            as medicines,
  (select count(*) from public.stock)                as stock_rows,
  (select count(*) from public.orders)               as orders,
  (select count(*) from public.order_status_history) as history_rows;
