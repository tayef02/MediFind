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
