$('year').textContent = new Date().getFullYear();

$('menu-btn').onclick = () => $('site-nav').classList.toggle('open');
document.querySelectorAll('#site-nav a').forEach(a => a.onclick = () => $('site-nav').classList.remove('open'));

function goSearch(q) {
  location.href = 'user-search.html?q=' + encodeURIComponent(q.trim());
}

$('hero-search').onsubmit = (e) => {
  e.preventDefault();
  goSearch($('hero-q').value);
};

document.querySelectorAll('[data-q]').forEach(a => a.onclick = (e) => {
  e.preventDefault();
  goSearch(a.dataset.q);
});

getMyProfile().then(p => {
  if (!p) return;
  const name = p.role === 'pharmacy' ? p.pharmacy_name : p.full_name;
  $('header-actions').innerHTML = `
    <span class="hello">${esc(name)}</span>
    <a href="${HOME[p.role]}" class="btn btn-primary btn-sm">${p.role === 'pharmacy' ? 'Dashboard' : 'Search'}</a>
    <button class="btn btn-outline btn-sm" onclick="logout()">Logout</button>`;
});
