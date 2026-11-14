const form = $('login-form'), btn = form.querySelector('[type=submit]');

const next = new URLSearchParams(location.search).get('next');

function goHome(role) {
  const safe = next && /^[\w-]+\.html(\?.*)?$/.test(next);
  location.href = safe && next.startsWith(role === 'pharmacy' ? 'pharmacy' : 'user') ? next : HOME[role];
}

getMyProfile().then(p => { if (p) goHome(p.role); });

function fail(msg) {
  btn.disabled = false;
  btn.textContent = 'Login';
  toast(msg, 'error');
}

form.onsubmit = async (e) => {
  e.preventDefault();
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  const { error } = await sb.auth.signInWithPassword({
    email: form.elements.email.value.trim(),
    password: form.elements.password.value,
  });
  if (error) return fail(error.message);

  const profile = await getMyProfile();
  if (!profile) {
    await sb.auth.signOut();
    return fail('Profile not found. Please register again.');
  }
  goHome(profile.role);
};
