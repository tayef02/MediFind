'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import { money, sellUnits, breakdown, updateBadge } from '@/lib/units';

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function groupByMedicine(rows) {
  const groups = [];
  for (const row of rows) {
    let group = groups.find((g) => g.medicine.name === row.medicine.name);
    if (!group) {
      group = { medicine: row.medicine, items: [] };
      groups.push(group);
    }
    group.items.push(row);
  }
  return groups;
}

export default function SearchPage() {
  const profile = useProfile('user');
  const router = useRouter();

  const [searchText, setSearchText] = useState('');
  const [district, setDistrict] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [districts, setDistricts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('Search by brand name or generic name.');
  const [quantities, setQuantities] = useState({});
  const [units, setUnits] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!profile) {
      return;
    }
    async function start() {
      const { data: categoryData } = await supabase.from('categories').select('id, name').order('name');
      setCategories(categoryData || []);

      try {
        const res = await fetch('https://bdapis.com/api/v1.2/districts');
        const json = await res.json();
        const list = json.data || [];
        list.sort((a, b) => a.district.localeCompare(b.district));
        setDistricts(list);
      } catch (err) {
        setDistricts([]);
      }

      const q = new URLSearchParams(window.location.search).get('q');
      if (q) {
        setSearchText(q);
        search(q, '', '');
      }
    }
    start();
  }, [profile]);

  async function search(text, place, category) {
    const q = text.replace(/[%_,()*"\\]/g, ' ').trim();
    setMessage(null);
    if (q.length < 2) {
      setStatus('Type at least 2 letters.');
      setResults([]);
      return;
    }
    setStatus('Searching...');

    let medicineQuery = supabase
      .from('medicines')
      .select('id')
      .or('name.ilike."%' + q + '%",generic_name.ilike."%' + q + '%"');
    if (category) {
      medicineQuery = medicineQuery.eq('category_id', category);
    }
    const { data: medicines, error: e1 } = await medicineQuery.limit(50);
    if (e1) {
      setStatus('Error: ' + e1.message);
      return;
    }
    if (medicines.length === 0) {
      setStatus('No medicine found for "' + text + '".');
      setResults([]);
      return;
    }

    const ids = medicines.map((m) => m.id);
    const { data: rows, error: e2 } = await supabase
      .from('stock')
      .select(`id, quantity, price, pharmacy_id, sell_loose, sell_strip, sell_box,
        medicine:medicines(name, generic_name, unit, strip_size, box_size, box_name, pack_info,
          company:companies(name), category:categories(name)),
        pharmacy:pharmacies(name, address, district, upazila)`)
      .in('medicine_id', ids)
      .gt('quantity', 0)
      .or('expiry_date.is.null,expiry_date.gte.' + todayISO())
      .order('price');
    if (e2) {
      setStatus('Error: ' + e2.message);
      return;
    }

    let list = rows;
    if (place) {
      list = rows.filter((r) => r.pharmacy.district === place);
    }
    if (list.length === 0) {
      setStatus('"' + text + '" is not in stock right now' + (place ? ' in ' + place + '.' : '.'));
      setResults([]);
      return;
    }

    const groups = groupByMedicine(list);
    const pharmacyCount = new Set(list.map((r) => r.pharmacy_id)).size;
    setStatus(groups.length + ' medicine(s) found in ' + pharmacyCount + ' pharmacy(s).');
    setResults(groups);
  }

  function handleSubmit(e) {
    e.preventDefault();
    router.replace('/search?q=' + encodeURIComponent(searchText.trim()));
    search(searchText, district, categoryId);
  }

  function defaultUnitSize(medicine, row) {
    const list = sellUnits(medicine, row);
    for (const u of list) {
      if (u.name === 'strip' && row.quantity >= u.size) {
        return u.size;
      }
    }
    return list[0].size;
  }

  async function addToCart(row) {
    const qty = Number(quantities[row.id] || 1);
    const size = Number(units[row.id] || defaultUnitSize(row.medicine, row));
    const total = qty * size;

    if (!(total >= 1)) {
      setMessage({ type: 'error', text: 'Enter a quantity.' });
      return;
    }

    const { data: old } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', profile.id)
      .eq('stock_id', row.id)
      .maybeSingle();

    const inCart = old ? old.quantity : 0;
    if (inCart + total > row.quantity) {
      setMessage({ type: 'error', text: 'Only ' + breakdown(row.quantity - inCart, row.medicine, row) + ' more available.' });
      return;
    }

    let error;
    if (old) {
      const result = await supabase.from('cart_items').update({ quantity: inCart + total }).eq('id', old.id);
      error = result.error;
    } else {
      const result = await supabase.from('cart_items').insert({ user_id: profile.id, stock_id: row.id, quantity: total });
      error = result.error;
    }

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: row.medicine.name + ': ' + breakdown(total, row.medicine, row) + ' added to cart.' });
      updateBadge();
    }
  }

  function priceLines(row) {
    const list = sellUnits(row.medicine, row);
    let main = list.find((u) => u.name === 'strip');
    if (!main) {
      main = list[0];
    }
    const others = list.filter((u) => u !== main);
    return (
      <>
        <strong>{money(row.price * main.size)}</strong> <small className="muted">/ {main.name}</small>
        {others.map((u) => (
          <div key={u.name}><small className="muted">{money(row.price * u.size)} / {u.name}</small></div>
        ))}
      </>
    );
  }

  if (!profile) {
    return <p className="container muted">Loading...</p>;
  }

  return (
    <>
      <Navbar profile={profile} />
      <main className="container">
        <h1>Find medicine</h1>

        <form className="search-bar" onSubmit={handleSubmit}>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Medicine or generic name, e.g. Napa or Paracetamol"
            required
            minLength="2"
          />
          <select value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d.district} value={d.district}>{d.district}</option>
            ))}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">Search</button>
        </form>

        <p className="muted">{status}</p>
        {message && <p className={message.type}>{message.text}</p>}

        {results.map((group) => (
          <div className="card" key={group.medicine.name}>
            <div className="result-head">
              <h3>{group.medicine.name}</h3>
              <span className="muted">{group.medicine.generic_name}</span>
              <span className="tag">{group.medicine.company ? group.medicine.company.name : ''}</span>
              <span className="tag">{group.medicine.category ? group.medicine.category.name : ''}</span>
              {group.medicine.pack_info && <span className="tag">{group.medicine.pack_info}</span>}
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pharmacy</th>
                    <th>Price</th>
                    <th>In stock</th>
                    <th>Quantity</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.pharmacy.name}</strong>
                        {group.items.length > 1 && row.price === group.items[0].price && (
                          <span className="tag green">Lowest price</span>
                        )}
                        <div>
                          <small className="muted">
                            {row.pharmacy.address}{row.pharmacy.upazila ? ', ' + row.pharmacy.upazila + ', ' + row.pharmacy.district : ''}
                          </small>
                        </div>
                      </td>
                      <td>{priceLines(row)}</td>
                      <td>{breakdown(row.quantity, row.medicine, row)}</td>
                      <td className="nowrap">
                        <input
                          type="number"
                          min="1"
                          className="qty-input"
                          value={quantities[row.id] || 1}
                          onChange={(e) => setQuantities({ ...quantities, [row.id]: e.target.value })}
                        />
                        <select
                          className="unit-select"
                          value={units[row.id] || defaultUnitSize(row.medicine, row)}
                          onChange={(e) => setUnits({ ...units, [row.id]: e.target.value })}
                        >
                          {sellUnits(row.medicine, row).map((u) => (
                            <option key={u.name} value={u.size} disabled={row.quantity < u.size}>
                              {u.name}{u.size > 1 ? ' (' + u.size + ')' : ''}: {Math.floor(row.quantity / u.size)} available
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => addToCart(row)}>Add to cart</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </main>
    </>
  );
}