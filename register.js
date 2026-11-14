const form = $('reg-form'), el = form.elements;

getMyProfile().then(p => { if (p) location.href = HOME[p.role]; });

if (new URLSearchParams(location.search).get('role') === 'pharmacy') {
  form.querySelector('[value=pharmacy]').checked = true;
}

function updateRole() {
  const isPharmacy = el.role.value === 'pharmacy';
  $('pharmacy-fields').classList.toggle('hidden', !isPharmacy);
  el.pharmacy_name.required = el.license_no.required = isPharmacy;
  $('addr-label').textContent = isPharmacy ? 'Pharmacy address' : 'Address';
}

form.querySelectorAll('[name=role]').forEach(radio => radio.onchange = updateRole);
updateRole();

form.onsubmit = async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  if (f.password !== f.password2) return toast('Passwords do not match', 'error');

  const meta = { role: f.role, full_name: f.full_name.trim(), phone: f.phone.trim(), address: f.address.trim() };
  if (f.role === 'pharmacy') {
    meta.pharmacy_name = f.pharmacy_name.trim();
    meta.license_no = f.license_no.trim();
  }

  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Creating account...';
  const { data, error } = await sb.auth.signUp({ email: f.email.trim(), password: f.password, options: { data: meta } });
  btn.disabled = false;
  btn.textContent = 'Register';

  if (error) return toast(error.message, 'error');
  if (data.session) location.href = HOME[f.role];
  else form.innerHTML = '<p class="success-msg">Account created. Please confirm your email, then <a href="login.html">login</a>.</p>';
};
