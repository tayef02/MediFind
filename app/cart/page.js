'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import { money, breakdown, updateBadge } from '@/lib/units';

function groupByPharmacy(items) {
  const groups = [];
  for (const item of items) {
    let group = groups.find((g) => g.pharmacy_id === item.stock.pharmacy_id);
    if (!group) {
      group = { pharmacy_id: item.stock.pharmacy_id, pharmacy: item.stock.pharmacy, items: [], total: 0 };
      groups.push(group);
    }
    group.items.push(item);
    group.total = group.total + item.quantity * item.stock.price;
  }
  return groups;
}

function stepFor(stock) {
  if (stock.medicine.strip_size && stock.sell_strip) {
    return stock.medicine.strip_size;
  }
  return 1;
}

export default function CartPage() {
  const profile = useProfile('user');
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [checkoutId, setCheckoutId] = useState(null);

  useEffect(() => {
    if (!profile) {
      return;
    }
    let fullAddress = profile.address || '';
    if (profile.location) {
      fullAddress = fullAddress ? fullAddress + ', ' + profile.location : profile.location;
    }
    setAddress(fullAddress);
    setPhone(profile.phone || '');
    loadCart();
  }, [profile]);

  async function loadCart() {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`id, quantity,
        stock:stock(id, quantity, price, pharmacy_id, sell_loose, sell_strip, sell_box,
          medicine:medicines(name, unit, strip_size, box_size, box_name),
          pharmacy:pharmacies(name, address))`)
      .eq('user_id', profile.id)
      .order('created_at');
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setItems(data);
    }
    setLoading(false);
    updateBadge();
  }

  async function changeQuantity(item, change) {
    const newQuantity = item.quantity + change;
    if (newQuantity <= 0) {
      removeItem(item);
      return;
    }
    if (newQuantity > item.stock.quantity) {
      setMessage({ type: 'error', text: 'Only ' + breakdown(item.stock.quantity, item.stock.medicine, item.stock) + ' available.' });
      return;
    }
    setMessage(null);
    await supabase.from('cart_items').update({ quantity: newQuantity }).eq('id', item.id);
    loadCart();
  }

  async function removeItem(item) {
    setMessage(null);
    await supabase.from('cart_items').delete().eq('id', item.id);
    loadCart();
  }

  function startCheckout(group) {
    setMessage(null);
    setCheckoutId(group.pharmacy_id);
  }

  async function placeOrder(group) {
    if (!address.trim()) {
      setMessage({ type: 'error', text: 'Please enter a delivery address.' });
      return;
    }
    setPlacing(true);
    const { data, error } = await supabase.rpc('place_order', {
      p_pharmacy: group.pharmacy_id,
      p_address: address.trim(),
      p_phone: phone.trim(),
      p_note: note.trim(),
    });
    setPlacing(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      loadCart();
      return;
    }
    updateBadge();
    router.push('/orders?placed=' + data);
  }

  if (!profile) {
    return <p className="container muted">Loading...</p>;
  }

  const groups = groupByPharmacy(items);

  return (
    <>
      <Navbar profile={profile} />
      <main className="container">
        <h1>My cart</h1>
        {message && <p className={message.type}>{message.text}</p>}

        {loading && <p className="muted">Loading...</p>}

        {!loading && items.length === 0 && (
          <div className="card center">
            <p className="muted">Your cart is empty.</p>
            <Link href="/search" className="btn btn-primary">Search medicine</Link>
          </div>
        )}

        {groups.length > 1 && (
          <p className="muted">Your cart has medicine from {groups.length} pharmacies. Each pharmacy gets its own order.</p>
        )}

        {groups.map((group) => (
          <div className="card" key={group.pharmacy_id}>
            <div className="result-head">
              <h3>{group.pharmacy.name}</h3>
              <span className="muted">{group.pharmacy.address}</span>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.stock.medicine.name}</strong></td>
                      <td className="nowrap">
                        <button className="btn btn-outline btn-sm" onClick={() => changeQuantity(item, -stepFor(item.stock))}>-</button>
                        <span className="qty-text">{breakdown(item.quantity, item.stock.medicine, item.stock)}</span>
                        <button className="btn btn-outline btn-sm" onClick={() => changeQuantity(item, stepFor(item.stock))}>+</button>
                      </td>
                      <td>{money(item.quantity * item.stock.price)}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => removeItem(item)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="order-row">
              <strong>Total: {money(group.total)}</strong>
              {checkoutId !== group.pharmacy_id && (
                <button className="btn btn-primary" onClick={() => startCheckout(group)}>Place order</button>
              )}
            </div>

            {checkoutId === group.pharmacy_id && (
              <div className="checkout">
                <h3>Delivery details</h3>
                <div className="form-grid">
                  <label>
                    Delivery address
                    <textarea rows="2" value={address} onChange={(e) => setAddress(e.target.value)} required />
                  </label>
                  <label>
                    Phone
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  <label>
                    Note for pharmacy
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
                  </label>
                </div>
                <button className="btn btn-primary" disabled={placing} onClick={() => placeOrder(group)}>
                  {placing ? 'Placing order...' : 'Confirm order (' + money(group.total) + ')'}
                </button>{' '}
                <button className="btn btn-outline" onClick={() => setCheckoutId(null)}>Cancel</button>
              </div>
            )}
          </div>
        ))}
      </main>
    </>
  );
}