const HOME = { user: 'user-search.html', pharmacy: 'pharmacy-dashboard.html' };
const CART_KEY = 'medifind_cart';
const UNITS = ['tablet', 'capsule', 'bottle', 'tube', 'packet', 'inhaler', 'piece'];
const BOX_NAMES = ['box', 'container', 'jar'];

const $ = id => document.getElementById(id);
const money = n => '৳' + Number(n || 0).toFixed(2);
const tag = (text, color) => `<span class="tag ${color}">${text}</span>`;
const sumBy = (list, fn) => list.reduce((total, x) => total + fn(x), 0);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function daysUntil(date) {
  if (!date) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(date + 'T00:00:00') - today) / 86400000);
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
}

function toast(msg, type = 'info') {
  let box = $('toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

const plural = u => u === 'box' ? 'boxes' : u + 's';

function unitCount(n, unit = 'piece') {
  return `${n} ${n == 1 ? unit : plural(unit)}`;
}

function sellUnits(m, s) {
  const hasPacks = m.strip_size || m.box_size;
  const list = [];
  if (!hasPacks || !s || s.sell_loose !== false) list.push({ name: m.unit, size: 1 });
  if (m.strip_size && (!s || s.sell_strip !== false)) list.push({ name: 'strip', size: m.strip_size });
  if (m.box_size && (!s || s.sell_box !== false)) list.push({ name: m.box_name || 'box', size: m.box_size });
  return list.length ? list : [{ name: m.unit, size: 1 }];
}

const mainUnit = m => m.strip_size ? { name: 'strip', size: m.strip_size } : { name: m.unit, size: 1 };

function splitQuantity(n, m, s) {
  const boxSize = m.box_size && (!s || s.sell_box !== false) ? m.box_size : 0;
  const stripSize = m.strip_size && (!s || s.sell_strip !== false) ? m.strip_size : 0;
  const box = boxSize ? Math.floor(n / boxSize) : 0;
  n -= box * boxSize;
  const strip = stripSize ? Math.floor(n / stripSize) : 0;
  return { box, strip, loose: n - strip * stripSize };
}

function breakdown(n, m, s) {
  const q = splitQuantity(n, m, s), parts = [];
  if (q.box) parts.push(unitCount(q.box, m.box_name || 'box'));
  if (q.strip) parts.push(unitCount(q.strip, 'strip'));
  if (q.loose || !parts.length) parts.push(unitCount(q.loose, m.unit));
  return parts.join(' + ');
}

function packText(m, s) {
  const options = sellUnits(m, s).map(u => u.size > 1 ? `${u.name} (${u.size})` : u.name).join(' / ');
  return options + (m.pack_info ? `, ${m.pack_info}` : '');
}

function statCard(num, label, color = '', extra = '') {
  return `<div class="stat ${color}"><div class="num">${num}</div><div class="label">${label}</div>${extra}</div>`;
}

function stockCalc(s) {
  const cost = Number(s.cost_price), sell = Number(s.price), unit = sell - cost;
  return {
    unit,
    margin: cost > 0 ? (unit / cost) * 100 : 0,
    costValue: s.quantity * cost,
    sellValue: s.quantity * sell,
    profit: s.quantity * unit,
  };
}

const profitText = n => `<span class="${n < 0 ? 'loss' : 'gain'}">${money(n)}</span>`;

function stockValueCards(stock) {
  const cost = sumBy(stock, s => stockCalc(s).costValue);
  const sell = sumBy(stock, s => stockCalc(s).sellValue);
  return statCard(money(cost), 'Stock value (buying price)') +
         statCard(money(sell), 'Stock value (selling price)') +
         statCard(money(sell - cost), 'Expected profit if all sold', sell < cost ? 'red' : '');
}

async function getMyProfile() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) return null;
  data.email = session.user.email;
  return data;
}

async function requireRole(role) {
  const profile = await getMyProfile();
  if (!profile) {
    await sb.auth.signOut();
    location.href = 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
    return new Promise(() => {});
  }
  if (role && profile.role !== role) {
    location.href = HOME[profile.role];
    return new Promise(() => {});
  }
  return profile;
}

async function logout() {
  localStorage.removeItem(CART_KEY);
  await sb.auth.signOut();
  location.href = 'login.html';
}

function renderNav(profile, activePage) {
  const isPharmacy = profile.role === 'pharmacy';
  const links = isPharmacy
    ? [['pharmacy-dashboard.html', 'Dashboard'], ['pharmacy-stock.html', 'Stock'],
       ['pharmacy-orders.html', 'Orders <span id="order-badge" class="badge hidden"></span>'], ['profile.html', 'Profile']]
    : [['user-search.html', 'Search'], ['user-cart.html', 'Cart <span id="cart-badge" class="badge hidden"></span>'],
       ['user-orders.html', 'My Orders'], ['profile.html', 'Profile']];

  $('nav').innerHTML = `
    <a class="brand" href="${HOME[profile.role]}">MediFind</a>
    <div class="nav-links">
      ${links.map(([href, text]) => `<a href="${href}" class="${href === activePage ? 'active' : ''}">${text}</a>`).join('')}
    </div>
    <div class="nav-user">
      <span>${esc(isPharmacy ? profile.pharmacy_name : profile.full_name)}</span>
      <button class="btn btn-sm btn-outline" onclick="logout()">Logout</button>
    </div>`;

  if (isPharmacy) {
    refreshOrderBadge(profile.id);
    setInterval(() => refreshOrderBadge(profile.id), 30000);
  } else {
    refreshCartBadge();
  }
}

async function refreshOrderBadge(pharmacyId) {
  const { count } = await sb.from('orders').select('id', { count: 'exact', head: true })
    .eq('pharmacy_id', pharmacyId).eq('status', 'pending');
  const b = $('order-badge');
  if (!b) return;
  b.textContent = count ? `${count} new` : '';
  b.classList.toggle('hidden', !count);
}

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  refreshCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const old = cart.find(i => i.stock_id === item.stock_id);
  if (old) Object.assign(old, { qty: Math.min(old.qty + item.qty, item.max), max: item.max, price: item.price });
  else cart.push(item);
  saveCart(cart);
}

const clearCart = () => saveCart([]);

function refreshCartBadge() {
  const b = $('cart-badge');
  if (!b) return;
  const n = sumBy(getCart(), i => i.qty);
  b.textContent = n;
  b.classList.toggle('hidden', !n);
}
