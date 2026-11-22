'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import { money, breakdown, formatDate, updateBadge } from '@/lib/units';

const tabs = ['pending', 'confirmed', 'delivered', 'rejected', 'all'];

export default function PharmacyOrdersPage() {
  const profile = useProfile('pharmacy');
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (profile) {
      loadOrders();
    }
  }, [profile]);

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select(`id, status, total, delivery_address, phone, note, created_at,
        customer:profiles(full_name, phone),
        order_items(id, medicine_name, quantity, unit_price,
          medicine:medicines(unit, strip_size, box_size, box_name))`)
      .eq('pharmacy_id', profile.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
    updateBadge();
  }

  async function changeStatus(order, status) {
    if (status === 'rejected' && !confirm('Reject order #' + order.id + '?')) {
      return;
    }
    setMessage(null);
    const { error } = await supabase.from('orders').update({ status: status }).eq('id', order.id);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Order #' + order.id + ' is now ' + status + '.' });
    loadOrders();
  }

  function countOf(name) {
    if (name === 'all') {
      return orders.length;
    }
    return orders.filter((o) => o.status === name).length;
  }

  if (!profile) {
    return <p className="container muted">Loading...</p>;
  }

  let shown = orders;
  if (tab !== 'all') {
    shown = orders.filter((o) => o.status === tab);
  }

  return (
    <>
      <Navbar profile={profile} />
      <main className="container">
        <h1>Orders</h1>

        <div className="tabs">
          {tabs.map((name) => (
            <button key={name} className={tab === name ? 'tab active' : 'tab'} onClick={() => setTab(name)}>
              {name} ({countOf(name)})
            </button>
          ))}
        </div>

        {message && <p className={message.type}>{message.text}</p>}
        {loading && <p className="muted">Loading...</p>}
        {!loading && shown.length === 0 && <p className="muted">No {tab === 'all' ? '' : tab} orders.</p>}

        {shown.map((order) => (
          <div className="card" key={order.id}>
            <div className="order-head">
              <div>
                <h3>Order #{order.id}</h3>
                <small className="muted">{formatDate(order.created_at)}</small>
              </div>
              <span className={'status status-' + order.status}>{order.status}</span>
            </div>

            <p>
              <strong>{order.customer.full_name}</strong> ({order.phone || order.customer.phone})
              <br />
              <small className="muted">{order.delivery_address}</small>
              {order.note && (
                <>
                  <br />
                  <small>Note: {order.note}</small>
                </>
              )}
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
              <strong>Total: {money(order.total)}</strong>
              <div>
                {order.status === 'pending' && (
                  <>
                    <button className="btn btn-danger btn-sm" onClick={() => changeStatus(order, 'rejected')}>Reject</button>{' '}
                    <button className="btn btn-primary btn-sm" onClick={() => changeStatus(order, 'confirmed')}>Accept</button>
                  </>
                )}
                {order.status === 'confirmed' && (
                  <button className="btn btn-primary btn-sm" onClick={() => changeStatus(order, 'delivered')}>Mark delivered</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
