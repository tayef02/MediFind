const statusEl = $('status'), resultsEl = $('results');
let rowById = {};

(async () => {
  renderNav(await requireRole('user'), 'user-search.html');
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    $('q').value = q;
    search(q);
  }
})();

$('search-form').onsubmit = (e) => {
  e.preventDefault();
  const q = $('q').value;
  history.replaceState(null, '', '?q=' + encodeURIComponent(q));
  search(q);
};

function priceText(price, m, r) {
  const units = sellUnits(m, r);
  const main = units.find(u => u.name === 'strip') || units[0];
  let html = `<strong>${money(price * main.size)}</strong> <small class="muted">/ ${main.name}</small>`;
  units.filter(u => u !== main).forEach(u => {
    html += `<br><small class="muted">${money(price * u.size)} / ${u.name}</small>`;
  });
  return html;
}

function unitOptions(m, r) {
  const units = sellUnits(m, r);
  const pick = units.find(u => u.name === 'strip' && r.quantity >= u.size) || units.find(u => r.quantity >= u.size);
  return units.map(u => {
    const left = Math.floor(r.quantity / u.size);
    const label = `${u.name}${u.size > 1 ? ` (${u.size})` : ''}: ${left} available`;
    return `<option value="${u.size}" ${u === pick ? 'selected' : ''} ${left ? '' : 'disabled'}>${label}</option>`;
  }).join('');
}

async function search(raw) {
  const q = raw.replace(/[%_,()*"\\]/g, ' ').trim();
  if (q.length < 2) return statusEl.textContent = 'Type at least 2 letters.';
  statusEl.textContent = 'Searching...';
  resultsEl.innerHTML = '';

  const { data: meds, error: e1 } = await sb.from('medicines').select('id')
    .or(`name.ilike."%${q}%",generic_name.ilike."%${q}%"`).limit(50);
  if (e1) return statusEl.textContent = 'Error: ' + e1.message;
  if (!meds.length) return statusEl.textContent = `No medicine found for "${raw}".`;

  const { data: rows, error: e2 } = await sb.from('stock')
    .select(`id, quantity, price, pharmacy_id, sell_loose, sell_strip, sell_box,
             medicine:medicines(name, generic_name, unit, strip_size, box_size, box_name, pack_info),
             pharmacy:profiles(pharmacy_name, address)`)
    .in('medicine_id', meds.map(m => m.id))
    .gt('quantity', 0)
    .or(`expiry_date.is.null,expiry_date.gte.${todayISO()}`)
    .order('price');
  if (e2) return statusEl.textContent = 'Error: ' + e2.message;
  if (!rows.length) return statusEl.textContent = `"${raw}" is not in stock at any pharmacy right now.`;

  rowById = {};
  const groups = {};
  rows.forEach(r => {
    rowById[r.id] = r;
    (groups[r.medicine.name] ||= { med: r.medicine, items: [] }).items.push(r);
  });

  const pharmacyCount = new Set(rows.map(r => r.pharmacy_id)).size;
  statusEl.textContent = `${Object.keys(groups).length} medicine(s) found in ${pharmacyCount} pharmacy(s).`;

  resultsEl.innerHTML = Object.values(groups).map(g => `
    <div class="card">
      <div class="result-head">
        <h3>${esc(g.med.name)}</h3>
        <span class="muted">${esc(g.med.generic_name)}</span>
        <span class="tag gray">Sold as ${esc(packText(g.med))}</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Pharmacy</th><th>Price</th><th>In stock</th><th>Quantity</th><th></th></tr></thead>
          <tbody>
            ${g.items.map(r => `
              <tr>
                <td>
                  <strong>${esc(r.pharmacy?.pharmacy_name)}</strong>
                  ${g.items.length > 1 && r.price === g.items[0].price ? tag('Lowest price', 'green') : ''}
                  <br><small class="muted">${esc(r.pharmacy?.address)}</small>
                </td>
                <td>${priceText(r.price, g.med, r)}</td>
                <td>${breakdown(r.quantity, g.med, r)}</td>
                <td class="nowrap">
                  <input type="number" class="qty-input" id="qty-${r.id}" min="1" value="1">
                  <select class="unit-select" id="unit-${r.id}">${unitOptions(g.med, r)}</select>
                </td>
                <td><button class="btn btn-sm btn-primary" data-id="${r.id}">Add to cart</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`).join('');
}

resultsEl.onclick = (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  const r = rowById[btn.dataset.id];
  const qty = parseInt($('qty-' + r.id).value, 10) * Number($('unit-' + r.id).value);
  const inCart = getCart().find(i => i.stock_id === r.id)?.qty || 0;
  if (!(qty >= 1)) return toast('Enter a quantity', 'error');
  if (qty + inCart > r.quantity) return toast(`Only ${breakdown(r.quantity - inCart, r.medicine, r)} more available`, 'error');

  addToCart({
    stock_id: r.id, pharmacy_id: r.pharmacy_id, pharmacy_name: r.pharmacy?.pharmacy_name,
    medicine_name: r.medicine.name, unit: r.medicine.unit,
    strip_size: r.medicine.strip_size, box_size: r.medicine.box_size, box_name: r.medicine.box_name,
    price: Number(r.price), qty, max: r.quantity,
  });
  toast(`${r.medicine.name}: ${breakdown(qty, r.medicine)} added to cart`, 'success');
};
