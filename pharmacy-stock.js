const form = $('stock-form'), el = form.elements, tbody = $('stock-body');
const MED_FIELDS = 'name, generic_name, unit, strip_size, box_size, box_name, pack_info';
let me, stock = [], medList = [], editingId = null;
let factor = 1, thresholdBase = 0;

(async () => {
  me = await requireRole('pharmacy');
  renderNav(me, 'pharmacy-stock.html');
  loadMedicineNames();
  loadStock();
})();

async function loadMedicineNames() {
  const { data } = await sb.from('medicines').select(MED_FIELDS).order('name');
  medList = data || [];
  $('med-names').innerHTML = medList.map(m => `<option value="${esc(m.name)}">`).join('');
}

async function loadStock() {
  const { data, error } = await sb.from('stock')
    .select(`id, quantity, cost_price, price, expiry_date, low_stock_threshold, sell_loose, sell_strip, sell_box, medicine:medicines(${MED_FIELDS})`)
    .eq('pharmacy_id', me.id);
  if (error) return toast(error.message, 'error');
  stock = data.sort((a, b) => a.medicine.name.localeCompare(b.medicine.name));
  $('stock-summary').innerHTML = stockValueCards(stock);
  render();
}

function statusOf(s) {
  const d = daysUntil(s.expiry_date), low = s.quantity <= s.low_stock_threshold;
  const tags = [];
  if (d < 0) tags.push(tag('Expired', 'red'));
  else if (d <= 30) tags.push(tag(`Expires in ${d}d`, 'yellow'));
  if (low) tags.push(tag('Low stock', 'red'));
  return {
    rowClass: low || d < 0 ? 'row-red' : d <= 30 ? 'row-yellow' : '',
    tags: tags.join(' ') || tag('OK', 'green'),
  };
}

function render() {
  const f = $('filter').value.trim().toLowerCase();
  const rows = stock.filter(s => (s.medicine.name + ' ' + (s.medicine.generic_name || '')).toLowerCase().includes(f));

  if (!rows.length) {
    $('stock-foot').innerHTML = '';
    tbody.innerHTML = `<tr><td colspan="10" class="empty">${stock.length ? 'No match.' : 'No medicine added yet.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(s => {
    const st = statusOf(s), c = stockCalc(s), main = mainUnit(s.medicine);
    return `
      <tr class="${st.rowClass}">
        <td>
          <strong>${esc(s.medicine.name)}</strong><br>
          <small class="muted">${esc(s.medicine.generic_name)}<br>Sells: ${esc(packText(s.medicine, s))}</small>
        </td>
        <td>${breakdown(s.quantity, s.medicine, s)}</td>
        <td>${money(s.cost_price * main.size)}<br><small class="muted">/ ${main.name}</small></td>
        <td>${money(s.price * main.size)}<br><small class="muted">/ ${main.name}</small></td>
        <td>${profitText(c.unit * main.size)}<br><small class="muted">${c.margin.toFixed(1)}%</small></td>
        <td>${money(c.costValue)}</td>
        <td>${profitText(c.profit)}</td>
        <td>${formatDate(s.expiry_date)}</td>
        <td>${st.tags}</td>
        <td class="nowrap">
          <button class="btn btn-sm btn-outline" data-edit="${s.id}">Edit</button>
          <button class="btn btn-sm btn-danger" data-del="${s.id}">Delete</button>
        </td>
      </tr>`;
  }).join('');

  $('stock-foot').innerHTML = `
    <tr class="bold">
      <td>Total</td><td>${rows.length} item(s)</td><td colspan="3"></td>
      <td>${money(sumBy(rows, s => stockCalc(s).costValue))}</td>
      <td>${profitText(sumBy(rows, s => stockCalc(s).profit))}</td><td colspan="3"></td>
    </tr>`;
}

$('filter').oninput = render;

el.unit.innerHTML = UNITS.map(u => `<option value="${u}">${u}</option>`).join('');
el.box_name.innerHTML = BOX_NAMES.map(b => `<option value="${b}">${b}</option>`).join('');

const formMedicine = () => ({
  unit: el.unit.value,
  strip_size: parseInt(el.strip_size.value, 10) || null,
  box_size: parseInt(el.box_size.value, 10) || null,
  box_name: el.box_name.value,
});

const capital = t => t.charAt(0).toUpperCase() + t.slice(1);

function updateMedicineFields() {
  const loose = ['tablet', 'capsule'].includes(el.unit.value);
  if (!loose) el.strip_size.value = el.box_size.value = '';
  const m = formMedicine(), hasPacks = !!(m.strip_size || m.box_size);

  document.querySelectorAll('.tablet-only').forEach(x => x.classList.toggle('hidden', !loose));
  document.querySelectorAll('.pack-only').forEach(x => x.classList.toggle('hidden', loose));
  document.querySelectorAll('.strip-only').forEach(x => x.classList.toggle('hidden', !m.strip_size));
  document.querySelectorAll('.box-only').forEach(x => x.classList.toggle('hidden', !m.box_size));
  document.querySelectorAll('.pack-sell').forEach(x => x.classList.toggle('hidden', !hasPacks));
  if (!m.strip_size) el.qty_strip.value = '';
  if (!m.box_size) el.qty_box.value = '';

  document.querySelectorAll('.unit-name').forEach(x => x.textContent = el.unit.value);
  document.querySelectorAll('.unit-plural').forEach(x => x.textContent = plural(el.unit.value));
  document.querySelectorAll('.box-label').forEach(x => x.textContent = el.box_name.value);
  document.querySelectorAll('.box-plural').forEach(x => x.textContent = capital(plural(el.box_name.value)));
  document.querySelectorAll('.loose-label').forEach(x =>
    x.textContent = hasPacks ? `Loose ${plural(el.unit.value)}` : capital(plural(el.unit.value)));
  buildCountIn();
  updateTotal();
}

function totalQty() {
  const m = formMedicine(), n = k => parseInt(el[k].value, 10) || 0;
  return n('qty_loose') + n('qty_strip') * (m.strip_size || 0) + n('qty_box') * (m.box_size || 0);
}

function updateTotal() {
  const t = totalQty(), m = formMedicine();
  $('total-line').textContent = m.strip_size || m.box_size
    ? `Total: ${breakdown(t, m)} (${unitCount(t, m.unit)})`
    : `Total: ${unitCount(t, m.unit)}`;
  updatePreview();
}

function buildCountIn(preferred) {
  const units = sellUnits(formMedicine());
  const want = preferred || el.count_in.selectedOptions[0]?.dataset.name || 'strip';
  el.count_in.innerHTML = units.map(u =>
    `<option value="${u.size}" data-name="${u.name}">${u.name}${u.size > 1 ? ` (${u.size} ${el.unit.value}s)` : ''}</option>`).join('');
  const pick = units.find(u => u.name === want) || mainUnit(formMedicine());
  el.count_in.value = pick.size;
  factor = pick.size;
  thresholdBase = (parseInt(el.low_stock_threshold.value, 10) || 0) * factor;
  updateCountLabels();
}

function updateCountLabels() {
  const name = el.count_in.selectedOptions[0]?.dataset.name || el.unit.value;
  document.querySelectorAll('.count-name').forEach(x => x.textContent = name);
  document.querySelectorAll('.count-plural').forEach(x => x.textContent = plural(name));
  updatePreview();
}

el.unit.onchange = updateMedicineFields;
el.box_name.onchange = updateMedicineFields;
el.strip_size.oninput = el.box_size.oninput = updateMedicineFields;
['qty_box', 'qty_strip', 'qty_loose'].forEach(n => el[n].oninput = updateTotal);
el.low_stock_threshold.oninput = () => thresholdBase = (parseInt(el.low_stock_threshold.value, 10) || 0) * factor;

el.count_in.onchange = () => {
  const next = Number(el.count_in.value);
  el.low_stock_threshold.value = thresholdBase ? Math.max(1, Math.round(thresholdBase / next)) : 0;
  ['cost_price', 'price'].forEach(k => { if (el[k].value) el[k].value = (el[k].value * next / factor).toFixed(2); });
  factor = next;
  updateCountLabels();
};

function updatePreview() {
  const cost = parseFloat(el.cost_price.value), sell = parseFloat(el.price.value);
  const t = totalQty(), name = el.count_in.selectedOptions[0]?.dataset.name || el.unit.value;
  const box = $('profit-preview');
  if (isNaN(cost) || isNaN(sell)) {
    box.className = 'profit-preview';
    box.textContent = 'Enter buying and selling price to see profit.';
    return;
  }
  const c = stockCalc({ cost_price: cost / factor, price: sell / factor, quantity: t });
  const unitProfit = sell - cost;
  box.className = 'profit-preview ' + (unitProfit < 0 ? 'loss' : 'gain');
  box.innerHTML = unitProfit < 0
    ? `Loss of <b>${money(-unitProfit)}</b> per ${name}. Selling price is lower than buying price.`
    : `Profit <b>${money(unitProfit)}</b> per ${name} (${c.margin.toFixed(1)}%)` +
      (t ? `. For ${breakdown(t, formMedicine())}: cost <b>${money(c.costValue)}</b>, sales <b>${money(c.sellValue)}</b>, profit <b>${money(c.profit)}</b>` : '');
}
['cost_price', 'price'].forEach(n => el[n].oninput = updatePreview);

function fillMedicine(m) {
  el.generic_name.value = m.generic_name || '';
  el.unit.value = m.unit;
  el.strip_size.value = m.strip_size || '';
  el.box_size.value = m.box_size || '';
  el.box_name.value = m.box_name || 'box';
  el.pack_info.value = m.pack_info || '';
}

function lockMedicine(lock) {
  ['generic_name', 'unit', 'strip_size', 'box_size', 'box_name', 'pack_info'].forEach(k => el[k].disabled = lock);
  el.strip_size.placeholder = lock ? 'No strip' : 'e.g. 10, leave empty if none';
  el.box_size.placeholder = lock ? 'No box' : 'e.g. 100, leave empty if none';
}

function openForm(row) {
  editingId = row ? row.id : null;
  form.reset();
  $('form-title').textContent = row ? 'Edit medicine' : 'Add medicine';
  el.name.disabled = !!row;
  lockMedicine(!!row);

  if (row) {
    el.name.value = row.medicine.name;
    fillMedicine(row.medicine);
    ['sell_loose', 'sell_strip', 'sell_box'].forEach(k => el[k].checked = row[k] !== false);
    updateMedicineFields();
    const q = splitQuantity(row.quantity, row.medicine, row);
    el.qty_box.value = q.box || '';
    el.qty_strip.value = q.strip || '';
    el.qty_loose.value = q.loose || '';
    const main = mainUnit(row.medicine);
    buildCountIn(main.name);
    el.low_stock_threshold.value = Math.round(row.low_stock_threshold / main.size);
    thresholdBase = row.low_stock_threshold;
    el.cost_price.value = (row.cost_price * main.size).toFixed(2);
    el.price.value = (row.price * main.size).toFixed(2);
    el.expiry_date.value = row.expiry_date || '';
    updateTotal();
  } else {
    el.strip_size.value = 10;
    updateMedicineFields();
    buildCountIn('strip');
  }
  updatePreview();
  $('form-card').classList.remove('hidden');
  $('form-card').scrollIntoView({ behavior: 'smooth' });
  (row ? el.qty_strip : el.name).focus();
}

function closeForm() {
  $('form-card').classList.add('hidden');
  editingId = null;
}

$('add-btn').onclick = () => openForm();
$('cancel-btn').onclick = closeForm;

el.name.onchange = () => {
  const m = medList.find(x => x.name.toLowerCase() === el.name.value.trim().toLowerCase());
  if (m) fillMedicine(m);
  else if (el.unit.disabled) fillMedicine({ unit: 'tablet', strip_size: 10 });
  lockMedicine(!!m);
  updateMedicineFields();
};

tbody.onclick = async (e) => {
  const { edit, del } = e.target.dataset;
  if (edit) openForm(stock.find(s => s.id == edit));
  if (del) {
    const row = stock.find(s => s.id == del);
    if (!confirm(`Remove ${row.medicine.name} from your stock?`)) return;
    const { error } = await sb.from('stock').delete().eq('id', del);
    if (error) return toast(error.message, 'error');
    toast('Deleted', 'success');
    loadStock();
  }
};

async function getOrCreateMedicine() {
  const name = el.name.value.trim();
  const { data: found, error: e1 } = await sb.from('medicines').select('id')
    .ilike('name', name.replace(/[%_\\]/g, '\\$&')).maybeSingle();
  if (e1) throw e1;
  if (found) return found.id;

  const { data, error } = await sb.from('medicines').insert({
    name,
    generic_name: el.generic_name.value.trim() || null,
    ...formMedicine(),
    pack_info: el.pack_info.value.trim() || null,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

form.onsubmit = async (e) => {
  e.preventDefault();
  const m = formMedicine(), hasPacks = !!(m.strip_size || m.box_size);
  const sell = {
    sell_loose: !hasPacks || el.sell_loose.checked,
    sell_strip: !m.strip_size || el.sell_strip.checked,
    sell_box: !m.box_size || el.sell_box.checked,
  };
  if (hasPacks && !(el.sell_loose.checked || (m.strip_size && el.sell_strip.checked) || (m.box_size && el.sell_box.checked))) {
    return toast('Select at least one way to sell', 'error');
  }
  const payload = {
    quantity: totalQty(),
    ...sell,
    cost_price: Number(el.cost_price.value) / factor,
    price: Number(el.price.value) / factor,
    expiry_date: el.expiry_date.value || null,
    low_stock_threshold: thresholdBase,
    updated_at: new Date().toISOString(),
  };
  if (payload.price < payload.cost_price &&
      !confirm('Selling price is lower than buying price. Save anyway?')) return;

  const btn = $('save-btn');
  btn.disabled = true;
  try {
    if (editingId) {
      const { error } = await sb.from('stock').update(payload).eq('id', editingId);
      if (error) throw error;
      toast('Updated', 'success');
    } else {
      const medicine_id = await getOrCreateMedicine();
      const { error } = await sb.from('stock').insert({ ...payload, pharmacy_id: me.id, medicine_id });
      if (error) throw error.code === '23505' ? new Error('This medicine is already in your stock. Use Edit instead.') : error;
      toast('Medicine added', 'success');
      loadMedicineNames();
    }
    closeForm();
    loadStock();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
};
