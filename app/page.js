'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getProfile } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    async function loadProfile() {
      const p = await getProfile();
      setProfile(p);
    }
    loadProfile();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    router.push('/search?q=' + encodeURIComponent(searchText.trim()));
  }

  return (
    <>
      {profile ? (
        <Navbar profile={profile} />
      ) : (
        <header className="site-header">
          <div className="wrap header-row">
            <Link href="/" className="brand">MediFind</Link>
            <nav className="site-nav">
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#contact">Contact</a>
            </nav>
            <div className="header-actions">
              <Link href="/login" className="btn btn-outline btn-sm">Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Register</Link>
            </div>
          </div>
        </header>
      )}

      <section className="hero">
        <div className="wrap">
          <h1>Search medicine in Sylhet pharmacies</h1>
          <p>Find which pharmacy has your medicine, compare prices and order for home delivery.</p>
          <form className="hero-search" onSubmit={handleSearch}>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Medicine or generic name, e.g. Napa or Paracetamol"
              required
              minLength="2"
            />
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <h2>How it works</h2>
          <div className="three-col">
            <div className="box">
              <span className="step-no">1</span>
              <h3>Search</h3>
              <p>Type the brand name or the generic name of the medicine.</p>
            </div>
            <div className="box">
              <span className="step-no">2</span>
              <h3>Compare</h3>
              <p>See which pharmacies have it and choose the price you like.</p>
            </div>
            <div className="box">
              <span className="step-no">3</span>
              <h3>Order</h3>
              <p>Add to cart, give your address and track the order.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section gray" id="features">
        <div className="wrap two-col">
          <div className="box">
            <h3>For users</h3>
            <ul>
              <li>Search by brand or generic name</li>
              <li>Compare price between pharmacies</li>
              <li>Buy by tablet, strip or box</li>
              <li>See order status</li>
            </ul>
            <Link href="/register" className="btn btn-primary">Register as user</Link>
          </div>
          <div className="box">
            <h3>For pharmacies</h3>
            <ul>
              <li>Manage stock and prices</li>
              <li>Low stock and expiry warning</li>
              <li>See sales and profit</li>
              <li>Accept and deliver orders</li>
            </ul>
            <Link href="/register?role=pharmacy" className="btn btn-primary">Register as pharmacy</Link>
          </div>
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div className="wrap footer-row">
          <div>
            <p className="footer-brand">MediFind</p>
            <p>Medicine search for Sylhet.</p>
          </div>
          <div>
            <p>Zindabazar, Sylhet</p>
            <p>support@medifind.example</p>
          </div>
        </div>
        <p className="wrap copyright">&copy; 2026 MediFind</p>
      </footer>
    </>
  );
}