'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const userLinks = [
  { href: '/search', label: 'Search' },
  { href: '/cart', label: 'Cart', badge: true },
  { href: '/orders', label: 'My Orders' },
  { href: '/profile', label: 'Profile' },
];

const pharmacyLinks = [
  { href: '/pharmacy/dashboard', label: 'Dashboard' },
  { href: '/pharmacy/stock', label: 'Stock' },
  { href: '/pharmacy/orders', label: 'Orders', badge: true },
  { href: '/profile', label: 'Profile' },
];

export default function Navbar({ profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    async function loadBadge() {
      if (profile.role === 'pharmacy') {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('pharmacy_id', profile.id)
          .eq('status', 'pending');
        setBadge(count || 0);
      } else {
        const { count } = await supabase
          .from('cart_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id);
        setBadge(count || 0);
      }
    }
    loadBadge();
    window.addEventListener('badge-update', loadBadge);
    return () => window.removeEventListener('badge-update', loadBadge);
  }, [profile]);

  let links = userLinks;
  let name = profile.full_name;
  let badgeText = String(badge);
  if (profile.role === 'pharmacy') {
    links = pharmacyLinks;
    name = profile.pharmacy ? profile.pharmacy.name : profile.full_name;
    badgeText = badge + ' new';
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

    return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link href="/" className="brand">MediFind</Link>
        <div className="nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
              {link.label}
              {link.badge && badge > 0 && <span className="badge">{badgeText}</span>}
            </Link>
          ))}
        </div>
        <div className="nav-user">
          <span>{name}</span>
          <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}