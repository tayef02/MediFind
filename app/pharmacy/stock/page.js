'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import { money, plural, unitCount, sellUnits, breakdown, mainUnit, splitQuantity, stockCalc, daysUntil } from '@/lib/units';

const UNITS = ['tablet', 'capsule', 'bottle', 'tube', 'packet', 'inhaler', 'piece'];
const PACK_UNITS = ['tablet', 'capsule'];
const BOX_NAMES = ['box', 'container', 'jar'];

const emptyForm = {
  name: '',
  generic_name: '',
  category_id: '',
  company_id: '',
  unit: 'tablet',
  strip_size: '10',
  box_size: '',
  box_name: 'box',
  pack_info: '',
  sell_loose: true,
  sell_strip: true,
  sell_box: true,
  qty_box: '',
  qty_strip: '',
  qty_loose: '',
  expiry_date: '',
  price_unit: '10',
  cost_price: '',
  price: '',
  low_alert: '5',
};

function toNumber(value) {
  const n = parseInt(value, 10);
  if (isNaN(n)) {
    return 0;
  }
  return n;
}

function textOf(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function medicineFields(m) {
  return {
    generic_name: textOf(m.generic_name),
    category_id: textOf(m.category_id),
    company_id: textOf(m.company_id),
    unit: m.unit,
    strip_size: textOf(m.strip_size),
    box_size: textOf(m.box_size),
    box_name: m.box_name || 'box',
    pack_info: textOf(m.pack_info),
  };
}

function formMedicine(form) {
  return {
    unit: form.unit,
    strip_size: toNumber(form.strip_size) || null,
    box_size: toNumber(form.box_size) || null,
    box_name: form.box_name,
  };
}

function totalQuantity(form) {
  const m = formMedicine(form);
  return toNumber(form.qty_loose) + toNumber(form.qty_strip) * (m.strip_size || 0) + toNumber(form.qty_box) * (m.box_size || 0);
}

function statusOf(row) {
  const days = daysUntil(row.expiry_date);
  const low = row.quantity <= row.low_stock_threshold;
  const tags = [];
  if (days < 0) {
    tags.push({ text: 'Expired', color: 'red' });
  } else if (days <= 30) {
    tags.push({ text: 'Expires in ' + days + 'd', color: 'yellow' });
  }
  if (low) {
    tags.push({ text: 'Low stock', color: 'red' });
  }
  if (tags.length === 0) {
    tags.push({ text: 'OK', color: 'green' });
  }

  let rowClass = '';
  if (low || days < 0) {
    rowClass = 'row-red';
  } else if (days <= 30) {
    rowClass = 'row-yellow';
  }
  return { tags: tags, rowClass: rowClass };
}

export default function StockPage() {
  const profile = useProfile('pharmacy');
  const [stock, setStock] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [locked, setLocked] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      loadLists();
      loadStock();
    }
  }, [profile]);

  async function loadLists() {
    const { data: medicineData } = await supabase
      .from('medicines')
      .select('id, name, generic_name, category_id, company_id, unit, strip_size, box_size, box_name, pack_info')
      .order('name');
    const { data: categoryData } = await supabase.from('categories').select('id, name').order('name');
    const { data: companyData } = await supabase.from('companies').select('id, name').order('name');
    setMedicines(medicineData || []);
    setCategories(categoryData || []);
    setCompanies(companyData || []);
  }

  async function loadStock() {
    const { data, error } = await supabase
      .from('stock')
      .select(`id, quantity, cost_price, price, expiry_date, low_stock_threshold, sell_loose, sell_strip, sell_box,
        medicine:medicines(id, name, generic_name, category_id, company_id, unit, strip_size, box_size, box_name, pack_info,
          company:companies(name))`)
      .eq('pharmacy_id', profile.id);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    data.sort((a, b) => a.medicine.name.localeCompare(b.medicine.name));
    setStock(data);
  }

  function handleChange(e) {
    const field = e.target.name;
    let value = e.target.value;
    if (e.target.type === 'checkbox') {
      value = e.target.checked;
    }
    let next = { ...form, [field]: value };

    if (field === 'name') {
      const found = medicines.find((m) => m.name.toLowerCase() === value.trim().toLowerCase());
      if (found) {
        next = { ...next, ...medicineFields(found) };
        setLocked(true);
      } else if (locked) {
        next = { ...next, ...medicineFields(emptyForm) };
        setLocked(false);
      }
    }

    if (field === 'unit' && !PACK_UNITS.includes(value)) {
      next.strip_size = '';
      next.box_size = '';
      next.qty_strip = '';
      next.qty_box = '';
    }

    if (field === 'price_unit') {
      const oldSize = Number(form.price_unit);
      const newSize = Number(value);
      if (next.cost_price !== '') {
        next.cost_price = (Number(next.cost_price) * newSize / oldSize).toFixed(2);
      }
      if (next.price !== '') {
        next.price = (Number(next.price) * newSize / oldSize).toFixed(2);
      }
    }

    const sizes = sellUnits(formMedicine(next)).map((u) => String(u.size));
    if (!sizes.includes(String(next.price_unit))) {
      next.price_unit = String(mainUnit(formMedicine(next)).size);
    }
    setForm(next);
  }

  function openAdd() {
    setForm(emptyForm);
    setLocked(false);
    setEditingId(null);
    setMessage(null);
    setShowForm(true);
  }

  function openEdit(row) {
    const m = row.medicine;
    const main = mainUnit(m);
    const q = splitQuantity(row.quantity, m, row);
    setForm({
      ...emptyForm,
      name: m.name,
      ...medicineFields(m),
      sell_loose: row.sell_loose,
      sell_strip: row.sell_strip,
      sell_box: row.sell_box,
      qty_box: q.boxes ? String(q.boxes) : '',
      qty_strip: q.strips ? String(q.strips) : '',
      qty_loose: q.loose ? String(q.loose) : '',
      expiry_date: row.expiry_date || '',
      price_unit: String(main.size),
      cost_price: (row.cost_price * main.size).toFixed(2),
      price: (row.price * main.size).toFixed(2),
      low_alert: String(Math.round(row.low_stock_threshold / main.size)),
    });
    setLocked(true);
    setEditingId(row.id);
    setMessage(null);
    setShowForm(true);
    window.scrollTo(0, 0);
  }

  async function deleteRow(row) {
    if (!confirm('Remove ' + row.medicine.name + ' from your stock?')) {
      return;
    }
    const { error } = await supabase.from('stock').delete().eq('id', row.id);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: row.medicine.name + ' removed.' });
    loadStock();
  }

  async function getOrCreateMedicine() {
    const name = form.name.trim();
    const { data: found, error: findError } = await supabase
      .from('medicines')
      .select('id')
      .ilike('name', name.replace(/[%_\\]/g, '\\$&'))
      .maybeSingle();
    if (findError) {
      throw findError;
    }
    if (found) {
      return found.id;
    }

    const m = formMedicine(form);
    const { data, error } = await supabase
      .from('medicines')
      .insert({
        name: name,
        generic_name: form.generic_name.trim() || null,
        category_id: form.category_id || null,
        company_id: form.company_id || null,
        unit: m.unit,
        strip_size: m.strip_size,
        box_size: m.box_size,
        box_name: m.box_name,
        pack_info: form.pack_info.trim() || null,
      })
      .select('id')
      .single();
    if (error) {
      throw error;
    }
    return data.id;
  }

  async function handleSave(e) {
    e.preventDefault();
    const m = formMedicine(form);
    const hasPacks = m.strip_size || m.box_size;

    if (hasPacks && !form.sell_loose && !(m.strip_size && form.sell_strip) && !(m.box_size && form.sell_box)) {
      setMessage({ type: 'error', text: 'Select at least one way to sell.' });
      return;
    }

    const priceSize = Number(form.price_unit);
    const payload = {
      quantity: totalQuantity(form),
      cost_price: Number(form.cost_price) / priceSize,
      price: Number(form.price) / priceSize,
      expiry_date: form.expiry_date || null,
      low_stock_threshold: toNumber(form.low_alert) * mainUnit(m).size,
      sell_loose: !hasPacks || form.sell_loose,
      sell_strip: !m.strip_size || form.sell_strip,
      sell_box: !m.box_size || form.sell_box,
      updated_at: new Date().toISOString(),
    };

    if (payload.price < payload.cost_price && !confirm('Selling price is lower than buying price. Save anyway?')) {
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('stock').update(payload).eq('id', editingId);
        if (error) {
          throw error;
        }
        setMessage({ type: 'success', text: form.name + ' updated.' });
      } else {
        const medicineId = await getOrCreateMedicine();
        const { error } = await supabase
          .from('stock')
          .insert({ ...payload, pharmacy_id: profile.id, medicine_id: medicineId });
        if (error) {
          if (error.code === '23505') {
            throw new Error('This medicine is already in your stock. Use Edit instead.');
          }
          throw error;
        }
        setMessage({ type: 'success', text: form.name + ' added.' });
        loadLists();
      }
      setShowForm(false);
      loadStock();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setSaving(false);
  }

  if (!profile) {
    return <p className="container muted">Loading...</p>;
  }

  const m = formMedicine(form);
  const hasPacks = m.strip_size || m.box_size;
  const isPackUnit = PACK_UNITS.includes(form.unit);
  const main = mainUnit(m);
  const priceUnits = sellUnits(m);
  const priceUnitName = priceUnits.find((u) => String(u.size) === String(form.price_unit));
  const total = totalQuantity(form);

  let preview = 'Enter buying and selling price to see profit.';
  let previewClass = 'profit-preview';
  if (form.cost_price !== '' && form.price !== '') {
    const unitProfit = Number(form.price) - Number(form.cost_price);
    const name = priceUnitName ? priceUnitName.name : form.unit;
    const size = Number(form.price_unit);
    if (unitProfit < 0) {
      preview = 'Loss of ' + money(-unitProfit) + ' per ' + name + '. Selling price is lower than buying price.';
      previewClass = 'profit-preview loss';
    } else {
      let margin = 0;
      if (Number(form.cost_price) > 0) {
        margin = (unitProfit / Number(form.cost_price)) * 100;
      }
      preview = 'Profit ' + money(unitProfit) + ' per ' + name + ' (' + margin.toFixed(1) + '%).';
      if (total > 0) {
        preview = preview + ' For all stock: cost ' + money(total * Number(form.cost_price) / size)
          + ', sales ' + money(total * Number(form.price) / size)
          + ', profit ' + money(total * unitProfit / size) + '.';
      }
      previewClass = 'profit-preview gain';
    }
  }

  const search = filter.trim().toLowerCase();
  const rows = stock.filter((row) => {
    const text = (row.medicine.name + ' ' + (row.medicine.generic_name || '')).toLowerCase();
    return text.includes(search);
  });

  let totalCost = 0;
  let totalSell = 0;
  for (const row of stock) {
    const c = stockCalc(row);
    totalCost = totalCost + c.costValue;
    totalSell = totalSell + c.sellValue;
  }

  return (
    <>
      <Navbar profile={profile} />
      <main className="container">
        <h1>Stock management</h1>

        <div className="toolbar">
          <input placeholder="Filter by name" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <button className="btn btn-primary" onClick={openAdd}>+ Add medicine</button>
        </div>

        {message && <p className={message.type}>{message.text}</p>}

        {showForm && (
          <form className="card" onSubmit={handleSave} autoComplete="off">
            <h2>{editingId ? 'Edit medicine' : 'Add medicine'}</h2>

            <h3 className="form-section">Medicine</h3>
            <div className="form-grid-4">
              <label>
                Medicine name
                <input name="name" list="medicine-names" value={form.name} onChange={handleChange} disabled={!!editingId} required />
                <datalist id="medicine-names">
                  {medicines.map((med) => (
                    <option key={med.id} value={med.name} />
                  ))}
                </datalist>
              </label>
              <label>
                Generic name
                <input name="generic_name" value={form.generic_name} onChange={handleChange} disabled={locked} />
              </label>
              <label>
                Category
                <select name="category_id" value={form.category_id} onChange={handleChange} disabled={locked}>
                  <option value="">Select</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Company
                <select name="company_id" value={form.company_id} onChange={handleChange} disabled={locked}>
                  <option value="">Select</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Smallest unit
                <select name="unit" value={form.unit} onChange={handleChange} disabled={locked}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
              {isPackUnit && (
                <>
                  <label>
                    {plural(form.unit)} per strip
                    <input type="number" min="1" name="strip_size" value={form.strip_size} onChange={handleChange}
                      disabled={locked} placeholder={locked ? 'No strip' : 'Leave empty if none'} />
                  </label>
                  <label>
                    Big pack
                    <select name="box_name" value={form.box_name} onChange={handleChange} disabled={locked}>
                      {BOX_NAMES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {plural(form.unit)} per {form.box_name}
                    <input type="number" min="1" name="box_size" value={form.box_size} onChange={handleChange}
                      disabled={locked} placeholder={locked ? 'No ' + form.box_name : 'Leave empty if none'} />
                  </label>
                </>
              )}
              {!isPackUnit && (
                <label>
                  Pack size
                  <input name="pack_info" value={form.pack_info} onChange={handleChange} disabled={locked} placeholder="e.g. 60 ml or 20 g" />
                </label>
              )}
            </div>

            <h3 className="form-section">Stock</h3>
            {hasPacks && (
              <div className="sell-as">
                <span>Sell as</span>
                <label className="check">
                  <input type="checkbox" name="sell_loose" checked={form.sell_loose} onChange={handleChange} /> {form.unit}
                </label>
                {m.strip_size && (
                  <label className="check">
                    <input type="checkbox" name="sell_strip" checked={form.sell_strip} onChange={handleChange} /> strip
                  </label>
                )}
                {m.box_size && (
                  <label className="check">
                    <input type="checkbox" name="sell_box" checked={form.sell_box} onChange={handleChange} /> {form.box_name}
                  </label>
                )}
              </div>
            )}
            <div className="form-grid-4">
              {m.box_size && (
                <label>
                  {plural(form.box_name)}
                  <input type="number" min="0" name="qty_box" value={form.qty_box} onChange={handleChange} placeholder="0" />
                </label>
              )}
              {m.strip_size && (
                <label>
                  strips
                  <input type="number" min="0" name="qty_strip" value={form.qty_strip} onChange={handleChange} placeholder="0" />
                </label>
              )}
              <label>
                {hasPacks ? 'loose ' + plural(form.unit) : plural(form.unit)}
                <input type="number" min="0" name="qty_loose" value={form.qty_loose} onChange={handleChange} placeholder="0" />
              </label>
              <label>
                Expiry date
                <input type="date" name="expiry_date" value={form.expiry_date} onChange={handleChange} />
              </label>
            </div>
            <p className="muted">
              Total: {breakdown(total, m)}{hasPacks && total > 0 ? ' (' + unitCount(total, form.unit) + ')' : ''}
            </p>

            <h3 className="form-section">Price</h3>
            <div className="form-grid-4">
              <label>
                Price per
                <select name="price_unit" value={form.price_unit} onChange={handleChange}>
                  {priceUnits.map((u) => (
                    <option key={u.name} value={u.size}>{u.name}{u.size > 1 ? ' (' + u.size + ')' : ''}</option>
                  ))}
                </select>
              </label>
              <label>
                Buying price (৳)
                <input type="number" min="0" step="0.01" name="cost_price" value={form.cost_price} onChange={handleChange} required />
              </label>
              <label>
                Selling price (৳)
                <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleChange} required />
              </label>
              <label>
                Low-stock alert ({plural(main.name)})
                <input type="number" min="0" name="low_alert" value={form.low_alert} onChange={handleChange} />
              </label>
            </div>

            <p className={previewClass}>{preview}</p>

            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>{' '}
            <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        )}

        <div className="stats">
          <div className="stat">
            <div className="num">{money(totalCost)}</div>
            <div className="label">Stock value (buying price)</div>
          </div>
          <div className="stat">
            <div className="num">{money(totalSell)}</div>
            <div className="label">Stock value (selling price)</div>
          </div>
          <div className="stat">
            <div className="num">{money(totalSell - totalCost)}</div>
            <div className="label">Expected profit if all sold</div>
          </div>
        </div>

        <p className="legend">
          <span className="legend-red"></span> Low stock or expired
          <span className="legend-yellow"></span> Expires within 30 days
        </p>

        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>In stock</th>
                <th>Buy</th>
                <th>Sell</th>
                <th>Profit</th>
                <th>Stock value</th>
                <th>Expected profit</th>
                <th>Expiry</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="10" className="muted center">{stock.length ? 'No match.' : 'No medicine added yet.'}</td>
                </tr>
              )}
              {rows.map((row) => {
                const status = statusOf(row);
                const calc = stockCalc(row);
                const rowMain = mainUnit(row.medicine);
                return (
                  <tr key={row.id} className={status.rowClass}>
                    <td>
                      <strong>{row.medicine.name}</strong>
                      <div><small className="muted">{row.medicine.generic_name}</small></div>
                      <div><small className="muted">{row.medicine.company ? row.medicine.company.name : ''}</small></div>
                    </td>
                    <td>{breakdown(row.quantity, row.medicine, row)}</td>
                    <td>{money(row.cost_price * rowMain.size)}<div><small className="muted">/ {rowMain.name}</small></div></td>
                    <td>{money(row.price * rowMain.size)}<div><small className="muted">/ {rowMain.name}</small></div></td>
                    <td>
                      <span className={calc.unitProfit < 0 ? 'loss' : 'gain'}>{money(calc.unitProfit * rowMain.size)}</span>
                      <div><small className="muted">{calc.margin.toFixed(1)}%</small></div>
                    </td>
                    <td>{money(calc.costValue)}</td>
                    <td><span className={calc.profit < 0 ? 'loss' : 'gain'}>{money(calc.profit)}</span></td>
                    <td className="nowrap">{row.expiry_date || '-'}</td>
                    <td>
                      {status.tags.map((t) => (
                        <span key={t.text} className={'tag ' + t.color}>{t.text}</span>
                      ))}
                    </td>
                    <td className="nowrap">
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(row)}>Edit</button>{' '}
                      <button className="btn btn-danger btn-sm" onClick={() => deleteRow(row)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
