'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import { money, breakdown, formatDate } from '@/lib/units';

export default function MyOrdersPage() {
  const profile = useProfile('user');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placedId, setPlacedId] = useState(null);

  useEffect(() => {
    if (!profile) {
      return;
    }
    setPlacedId(new URLSearchParams(window.location.search).get('placed'));

    async function loadOrders() {
      const { data } = await supabase
        .from('orders')
        .select(`id, status, total, delivery_address, phone, note, created_at,
          pharmacy:pharmacies(name, phone, address),
          order_items(id, medicine_name, quantity, unit_price,
            medicine:medicines(unit, strip_size, box_size, box_name)),
          order_status_history(id, status, changed_at)`)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    }
    loadOrders();
  }, [profile]);

  if (!profile) {
    return <p className="container muted">Loading...</p>;
  }

  return (
    <>
      <Navbar profile={profile} />
      <main className="container">
        <h1>My orders</h1>
        {placedId && <p className="success">Order #{placedId} placed. The pharmacy will confirm it soon.</p>}

        {loading && <p className="muted">Loading...</p>}

        {!loading && orders.length === 0 && (
          <div className="card center">
            <p className="muted">You have no orders yet.</p>
            <Link href="/search" className="btn btn-primary">Search medicine</Link>
          </div>
        )}

        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </main>
    </>
  );
}

function OrderCard({ order }) {
  const history = [...order.order_status_history].sort((a, b) => a.changed_at.localeCompare(b.changed_at));

  return (
    <div className="card">
      <div className="order-head">
        <div>
          <h3>Order #{order.id}</h3>
          <small className="muted">{formatDate(order.created_at)}</small>
        </div>
        <span className={'status status-' + order.status}>{order.status}</span>
      </div>

      <p>
        <strong>{order.pharmacy.name}</strong>
        <br />
        <small className="muted">{order.pharmacy.address}{order.pharmacy.phone ? ', ' + order.pharmacy.phone : ''}</small>
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((item) => (
            <tr key={item.id}>
              <td>{item.medicine_name}</td>
              <td>{breakdown(item.quantity, item.medicine || { unit: 'piece' })}</td>
              <td>{money(item.quantity * item.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="order-row">
        <small className="muted">Deliver to: {order.delivery_address}</small>
        <strong>Total: {money(order.total)}</strong>
      </div>

      <div className="history">
        {history.map((h) => (
          <span key={h.id}>
            <span className={'status status-' + h.status}>{h.status}</span>
            <small className="muted"> {formatDate(h.changed_at)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
