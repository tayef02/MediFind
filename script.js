function openModal(tab, role) {
  document.getElementById('modal').classList.add('active');
  switchTab(tab);
  if (role) setRole(role);
}
function closeModal() {
  document.getElementById('modal').classList.remove('active');
}
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function (t) { t.classList.remove('active'); });
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('content-' + tab).classList.add('active');
}
function setRole(role) {
  document.querySelectorAll('.role-btn').forEach(function (b) { b.classList.remove('active'); });
  document.getElementById('role-' + role).classList.add('active');
  document.getElementById('pharmacy-extra').style.display = role === 'pharmacy' ? 'block' : 'none';
  document.getElementById('reg-name').placeholder = role === 'pharmacy' ? 'Owner Name' : 'Full Name';
}
document.getElementById('modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
