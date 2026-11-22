'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getProfile, homeFor } from '@/lib/auth';
import LocationPicker from '@/components/LocationPicker';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    role: 'user',
    full_name: '',
    pharmacy_name: '',
    license_no: '',
    email: '',
    phone: '',
    division: '',
    district: '',
    upazila: '',
    address: '',
    password: '',
    password2: '',
  });

  useEffect(() => {
    async function start() {
      const profile = await getProfile();
      if (profile) {
        router.push(homeFor(profile.role));
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('role') === 'pharmacy') {
        setForm((old) => ({ ...old, role: 'pharmacy' }));
      }
    }
    start();
  }, [router]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.password2) {
      setError('Passwords do not match');
      return;
    }

    const meta = {
      role: form.role,
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      division: form.division,
      district: form.district,
      upazila: form.upazila,
    };
    if (form.role === 'pharmacy') {
      meta.pharmacy_name = form.pharmacy_name.trim();
      meta.license_no = form.license_no.trim();
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: meta },
    });
    setLoading(false);

    if (signUpError) {
      if (signUpError.message.includes('Database error')) {
        setError('Could not create account. The license number may already be used.');
      } else {
        setError(signUpError.message);
      }
      return;
    }

    if (data.session) {
      router.push(homeFor(form.role));
    } else {
      setError('Account created. Please confirm your email, then login.');
    }
  }

  const isPharmacy = form.role === 'pharmacy';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="brand">MediFind</Link>
        <h1>Create account</h1>

        <form onSubmit={handleSubmit}>
          <div className="role-picker">
            <label>
              <input type="radio" name="role" value="user" checked={form.role === 'user'} onChange={handleChange} />
              <span>User<small>Find and order medicine</small></span>
            </label>
            <label>
              <input type="radio" name="role" value="pharmacy" checked={isPharmacy} onChange={handleChange} />
              <span>Pharmacy<small>Manage stock and orders</small></span>
            </label>
          </div>

          <label>
            Full name
            <input name="full_name" value={form.full_name} onChange={handleChange} required />
          </label>

          {isPharmacy && (
            <>
              <label>
                Pharmacy name
                <input name="pharmacy_name" value={form.pharmacy_name} onChange={handleChange} required />
              </label>
              <label>
                License no
                <input name="license_no" value={form.license_no} onChange={handleChange} required />
              </label>
            </>
          )}

          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange} required
              pattern="01[0-9]{9}" title="11 digit number, e.g. 01712345678" placeholder="01XXXXXXXXX" />
          </label>
          <LocationPicker value={form} onChange={(place) => setForm({ ...form, ...place })} />
          <label>
            {isPharmacy ? 'Pharmacy address (house, road, area)' : 'Address (house, road, area)'}
            <textarea name="address" rows="2" value={form.address} onChange={handleChange} required
              placeholder="e.g. House 12, Road 3, Zindabazar" />
          </label>
          <label>
            Password
            <input type="password" name="password" minLength="6" value={form.password} onChange={handleChange} required />
          </label>
          <label>
            Confirm password
            <input type="password" name="password2" minLength="6" value={form.password2} onChange={handleChange} required />
          </label>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
          <p className="muted center">
            Already have an account? <Link href="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}