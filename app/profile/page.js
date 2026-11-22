'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/useProfile';
import LocationPicker from '@/components/LocationPicker';

function shortTime(value) {
  if (!value) {
    return '';
  }
  return value.slice(0, 5);
}

export default function ProfilePage() {
  const profile = useProfile();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [accountMessage, setAccountMessage] = useState(null);

  useEffect(() => {
    if (!profile) {
      return;
    }
    async function start() {
      setEmail(profile.email || '');

      const values = {
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        division: profile.division || '',
        district: profile.district || '',
        upazila: profile.upazila || '',
        address: profile.address || '',
      };
      if (profile.pharmacy) {
        values.pharmacy_name = profile.pharmacy.name || '';
        values.pharmacy_phone = profile.pharmacy.phone || '';
        values.pharmacy_address = profile.pharmacy.address || '';
        values.open_time = shortTime(profile.pharmacy.open_time);
        values.close_time = shortTime(profile.pharmacy.close_time);
      }
      setForm(values);
    }
    start();
  }, [profile]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        division: form.division,
        district: form.district,
        upazila: form.upazila,
        address: form.address.trim(),
      })
      .eq('id', profile.id);

    let pharmacyError = null;
    if (!error && profile.pharmacy) {
      const result = await supabase
        .from('pharmacies')
        .update({
          name: form.pharmacy_name.trim(),
          phone: form.pharmacy_phone.trim(),
          address: form.pharmacy_address.trim(),
          division: form.division,
          district: form.district,
          upazila: form.upazila,
          open_time: form.open_time || null,
          close_time: form.close_time || null,
        })
        .eq('id', profile.id);
      pharmacyError = result.error;
    }

    setSaving(false);
    if (error || pharmacyError) {
      setMessage({ type: 'error', text: (error || pharmacyError).message });
    } else {
      setMessage({ type: 'success', text: 'Profile saved.' });
    }
  }

  async function changeEmail(e) {
    e.preventDefault();
    setAccountMessage(null);
    const value = newEmail.trim();
    if (value === email) {
      setAccountMessage({ type: 'error', text: 'This is already your email.' });
      return;
    }

    const { data, error } = await supabase.auth.updateUser({ email: value });
    if (error) {
      setAccountMessage({ type: 'error', text: error.message });
      return;
    }
    if (data.user.email === value) {
      setEmail(value);
      setNewEmail('');
      setAccountMessage({ type: 'success', text: 'Email changed. Use the new email next time you login.' });
    } else {
      setAccountMessage({ type: 'success', text: 'We sent a confirmation link to ' + value + '. The email changes after you click it.' });
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setAccountMessage(null);
    if (newPassword !== newPassword2) {
      setAccountMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setAccountMessage({ type: 'error', text: error.message });
      return;
    }
    setNewPassword('');
    setNewPassword2('');
    setAccountMessage({ type: 'success', text: 'Password changed.' });
  }

  if (!profile || !form) {
    return <p className="container muted">Loading...</p>;
  }

  const isPharmacy = profile.role === 'pharmacy';

  return (
    <>
      <Navbar profile={profile} />
      <main className="container narrow">
        <h1>My profile</h1>
        {message && <p className={message.type}>{message.text}</p>}

        <form className="card" onSubmit={handleSave}>
          <h3 className="form-section">Account</h3>
          <label>
            Email
            <input className="readonly" value={email} readOnly />
          </label>
          <label>
            Account type
            <input className="readonly" value={isPharmacy ? 'Pharmacy' : 'User'} readOnly />
          </label>

          <h3 className="form-section">Personal</h3>
          <label>
            Full name
            <input name="full_name" value={form.full_name} onChange={handleChange} required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange}
              pattern="01[0-9]{9}" title="11 digit number, e.g. 01712345678" />
          </label>
          <LocationPicker value={form} onChange={(place) => setForm({ ...form, ...place })} />
          <label>
            Address (house, road, area)
            <textarea name="address" rows="2" value={form.address} onChange={handleChange} />
          </label>

          {isPharmacy && (
            <>
              <h3 className="form-section">Pharmacy</h3>
              <label>
                Pharmacy name
                <input name="pharmacy_name" value={form.pharmacy_name} onChange={handleChange} required />
              </label>
              <label>
                License no
                <input className="readonly" value={profile.pharmacy.license_no} readOnly />
              </label>
              <label>
                Pharmacy phone
                <input name="pharmacy_phone" value={form.pharmacy_phone} onChange={handleChange} />
              </label>
              <label>
                Pharmacy address
                <textarea name="pharmacy_address" rows="2" value={form.pharmacy_address} onChange={handleChange} required />
              </label>
              <div className="form-grid-2">
                <label>
                  Opens at
                  <input type="time" name="open_time" value={form.open_time} onChange={handleChange} />
                </label>
                <label>
                  Closes at
                  <input type="time" name="close_time" value={form.close_time} onChange={handleChange} />
                </label>
              </div>
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>

        {accountMessage && <p className={accountMessage.type}>{accountMessage.text}</p>}

        <form className="card" onSubmit={changeEmail}>
          <h3 className="form-section">Change email</h3>
          <label>
            New email
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          </label>
          <button className="btn btn-primary" type="submit">Change email</button>
        </form>

        <form className="card" onSubmit={changePassword}>
          <h3 className="form-section">Change password</h3>
          <label>
            New password
            <input type="password" minLength="6" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          <label>
            Confirm new password
            <input type="password" minLength="6" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} required />
          </label>
          <button className="btn btn-primary" type="submit">Change password</button>
        </form>
      </main>
    </>
  );
}