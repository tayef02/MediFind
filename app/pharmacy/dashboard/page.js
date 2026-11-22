'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import { money, breakdown, stockCalc, daysUntil } from '@/lib/units';

function isThisMonth(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function DashboardPage() {
  const profile = useProfile('pharmacy');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (profile) {
      loadDashboard();
    }
  }, [profile]);

  async function loadDashboard() {
    const { data: stock } = await supabase
      .from('stock')
      .select('quantity, cost_price, price, low_stock_threshold, expiry_date, sell_loose, sell_strip, sell_box, medicine:medicines(name, unit, strip_size, box_size, box_name)')
      .eq('pharmacy_id', profile.id);

    const { count: pending } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', profile.id)
      .eq('status', 'pending');

    const { data: delivered } = await supabase
      .from('orders')
      .select('updated_at, order_items(medicine_name, quantity, unit_price, unit_cost, medicine:medicines(unit, strip_size, box_size, box_name))')
      .eq('pharmacy_id', profile.id)
      .eq('status', 'delivered');

    const low = [];
    const expiring = [];
    let stockCost = 0;
    let stockSell = 0;
    for (const row of stock || []) {
      if (row.quantity <= row.low_stock_threshold) {
        low.push(row);
      }
      if (daysUntil(row.expiry_date) <= 30) {
        expiring.push(row);
      }
      const c = stockCalc(row);
      stockCost = stockCost + c.costValue;
      stockSell = stockSell + c.sellValue;
    }
    low.sort((a, b) => a.quantity - b.quantity);
    expiring.sort((a, b) => daysUntil(a.expiry_date) - daysUntil(b.expiry_date));

    let totalSales = 0;
    let totalProfit = 0;
    let monthSales = 0;
    let monthProfit = 0;
    let monthOrders = 0;
    const byMedicine = {};

    for (const order of delivered || []) {
      const inMonth = isThisMonth(order.updated_at);
      if (inMonth) {
        monthOrders = monthOrders + 1;
      }
      for (const item of order.order_items) {
        const sales = item.quantity * item.unit_price;
        const profit = item.quantity * (item.unit_price - item.unit_cost);
        totalSales = totalSales + sales;
        totalProfit = totalProfit + profit;
        if (inMonth) {
          monthSales = monthSales + sales;
          monthProfit = monthProfit + profit;
        }
        if (!byMedicine[item.medicine_name]) {
          byMedicine[item.medicine_name] = {
            name: item.medicine_name,
            medicine: item.medicine || { unit: 'piece' },
            quantity: 0,
            sales: 0,
            profit: 0,
          };
        }
        byMedicine[item.medicine_name].quantity += item.quantity;
        byMedicine[item.medicine_name].sales += sales;
        byMedicine[item.medicine_name].profit += profit;
      }
    }

    const top = Object.values(byMedicine).sort((a, b) => b.sales - a.sales).slice(0, 5);

    setData({
      stockCount: (stock || []).length,
      pending: pending || 0,
      low: low,
      expiring: expiring,
      stockCost: stockCost,
      stockSell: stockSell,
      totalSales: totalSales,
      totalProfit: totalProfit,
      monthSales: monthSales,
      monthProfit: monthProfit,
      monthOrders: monthOrders,
      deliveredCount: (delivered || []).length,
      top: top,
    });
  }

  if (!profile) {
    return <p className="container muted">Loading...</p>;
  }

  return (
    <>
      <Navbar profile={profile} />
      <main className="container">
        <h1>Hello, {profile.pharmacy.name}</h1>

        {!data && <p className="muted">Loading...</p>}

        {data && (
          <>
            <div className="stats">
              <div className="stat">
                <div className="num">{data.stockCount}</div>
                <div className="label">Medicines in stock</div>
                <Link href="/pharmacy/stock">Manage stock</Link>
              </div>
              <div className="stat red">
                <div className="num">{data.pending}</div>
                <div className="label">Pending orders</div>
                <Link href="/pharmacy/orders">View orders</Link>
              </div>
              <div className="stat red">
                <div className="num">{data.low.length}</div>
                <div className="label">Low stock</div>
              </div>
              <div className="stat yellow">
                <div className="num">{data.expiring.length}</div>
                <div className="label">Expiring in 30 days</div>
              </div>
            </div>

            <h2>Sales and profit</h2>
            <div className="stats">
              <div className="stat">
                <div className="num">{money(data.monthSales)}</div>
                <div className="label">Sold this month</div>
                <small className="muted">{data.monthOrders} delivered order(s)</small>
              </div>
              <div className="stat">
                <div className="num">{money(data.monthProfit)}</div>
                <div className="label">Profit this month</div>
              </div>
              <div className="stat">
                <div className="num">{money(data.totalSales)}</div>
                <div className="label">Total sold</div>
                <small className="muted">{data.deliveredCount} delivered order(s)</small>
              </div>
              <div className="stat">
                <div className="num">{money(data.totalProfit)}</div>
                <div className="label">Total profit</div>
              </div>
            </div>

            <h2>Stock value</h2>
            <div className="stats">
              <div className="stat">
                <div className="num">{money(data.stockCost)}</div>
                <div className="label">At buying price</div>
              </div>
              <div className="stat">
                <div className="num">{money(data.stockSell)}</div>
                <div className="label">At selling price</div>
              </div>
              <div className="stat">
                <div className="num">{money(data.stockSell - data.stockCost)}</div>
                <div className="label">Expected profit if all sold</div>
              </div>
            </div>

            <div className="two-col">
              <div className="card">
                <h3>Top selling medicines</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Sold</th>
                      <th>Sales</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top.length === 0 && (
                      <tr>
                        <td colSpan="4" className="muted">No delivered orders yet.</td>
                      </tr>
                    )}
                    {data.top.map((t) => (
                      <tr key={t.name}>
                        <td>{t.name}</td>
                        <td>{breakdown(t.quantity, t.medicine)}</td>
                        <td>{money(t.sales)}</td>
                        <td>{money(t.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <h3>Low stock</h3>
                <ul className="simple-list">
                  {data.low.length === 0 && <li className="muted">No low stock items.</li>}
                  {data.low.map((row) => (
                    <li key={row.medicine.name}>
                      <span>{row.medicine.name}</span>
                      <span className="tag red">{breakdown(row.quantity, row.medicine, row)} left</span>
                    </li>
                  ))}
                </ul>

                <h3>Expiring soon</h3>
                <ul className="simple-list">
                  {data.expiring.length === 0 && <li className="muted">No medicine expires in the next 30 days.</li>}
                  {data.expiring.map((row) => {
                    const days = daysUntil(row.expiry_date);
                    let text = days + ' day(s) left';
                    if (days < 0) {
                      text = 'Expired';
                    } else if (days === 0) {
                      text = 'Expires today';
                    }
                    return (
                      <li key={row.medicine.name}>
                        <span>{row.medicine.name}</span>
                        <span className={days < 0 ? 'tag red' : 'tag yellow'}>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
