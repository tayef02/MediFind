(async () => {
  const me = await requireRole('pharmacy');
  renderNav(me, 'pharmacy-dashboard.html');
  $('hello').textContent = me.pharmacy_name;

  const [stockRes, pendingRes, soldRes] = await Promise.all([
    sb.from('stock')
      .select('quantity, cost_price, price, low_stock_threshold, expiry_date, medicine:medicines(name, unit, strip_size)')
      .eq('pharmacy_id', me.id),
    sb.from('orders').select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', me.id).eq('status', 'pending'),
    sb.from('orders').select('updated_at, order_items(medicine_name, quantity, unit_price, unit_cost, medicine:medicines(unit, strip_size))')
      .eq('pharmacy_id', me.id).eq('status', 'delivered'),
  ]);
  const error = stockRes.error || soldRes.error;
  if (error) return toast(error.message, 'error');

  const stock = stockRes.data, orders = soldRes.data;
  const low = stock.filter(s => s.quantity <= s.low_stock_threshold).sort((a, b) => a.quantity - b.quantity);
  const expiring = stock.filter(s => daysUntil(s.expiry_date) <= 30)
                        .sort((a, b) => daysUntil(a.expiry_date) - daysUntil(b.expiry_date));

  $('overview').innerHTML =
    statCard(stock.length, 'Medicines in stock', '', '<a href="pharmacy-stock.html">Manage stock</a>') +
    statCard(pendingRes.count ?? 0, 'Pending orders', 'red', '<a href="pharmacy-orders.html">View orders</a>') +
    statCard(low.length, 'Low stock', 'red') +
    statCard(expiring.length, 'Expiring in 30 days', 'yellow');

  const now = new Date();
  const isThisMonth = d => new Date(d).getMonth() === now.getMonth() && new Date(d).getFullYear() === now.getFullYear();
  const total = { sales: 0, profit: 0 }, month = { sales: 0, profit: 0, orders: 0 }, byMed = {};

  orders.forEach(o => {
    const inMonth = isThisMonth(o.updated_at);
    if (inMonth) month.orders++;
    o.order_items.forEach(it => {
      const sales = it.quantity * it.unit_price;
      const profit = it.quantity * (it.unit_price - it.unit_cost);
      total.sales += sales;
      total.profit += profit;
      if (inMonth) { month.sales += sales; month.profit += profit; }
      const m = byMed[it.medicine_name] ||= { name: it.medicine_name, med: it.medicine || { unit: 'piece' }, qty: 0, sales: 0, profit: 0 };
      m.qty += it.quantity; m.sales += sales; m.profit += profit;
    });
  });

  $('sales').innerHTML =
    statCard(money(month.sales), 'Sold this month', '', `<div class="sub">${month.orders} delivered order(s)</div>`) +
    statCard(money(month.profit), 'Profit this month') +
    statCard(money(total.sales), 'Total sold (all time)', '', `<div class="sub">${orders.length} delivered order(s)</div>`) +
    statCard(money(total.profit), 'Total profit (all time)');

  $('stock-value').innerHTML = stockValueCards(stock);

  const top = Object.values(byMed).sort((a, b) => b.sales - a.sales).slice(0, 5);
  $('top-body').innerHTML = top.map(m =>
    `<tr><td>${esc(m.name)}</td><td>${breakdown(m.qty, m.med)}</td><td>${money(m.sales)}</td><td>${money(m.profit)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="muted">No delivered orders yet.</td></tr>';

  $('low-list').innerHTML = low.map(s =>
    `<li><span>${esc(s.medicine.name)}</span>${tag(breakdown(s.quantity, s.medicine) + ' left', 'red')}</li>`).join('')
    || '<li class="muted">No low stock items.</li>';

  $('exp-list').innerHTML = expiring.map(s => {
    const d = daysUntil(s.expiry_date);
    const text = d < 0 ? 'Expired' : d === 0 ? 'Expires today' : `${d} day(s) left`;
    return `<li><span>${esc(s.medicine.name)}</span>${tag(text, d < 0 ? 'red' : 'yellow')}</li>`;
  }).join('') || '<li class="muted">No medicine expires in the next 30 days.</li>';
})();
