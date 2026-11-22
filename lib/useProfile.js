'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, homeFor } from './auth';

export function useProfile(role) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function check() {
      const p = await getProfile();
      if (!p) {
        const here = window.location.pathname + window.location.search;
        router.push('/login?next=' + encodeURIComponent(here));
        return;
      }
      if (role && p.role !== role) {
        router.push(homeFor(p.role));
        return;
      }
      setProfile(p);
    }
    check();
  }, [role, router]);

  return profile;
}
