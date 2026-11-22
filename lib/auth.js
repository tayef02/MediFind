import { supabase } from './supabase';

export function homeFor(role) {
  if (role === 'pharmacy') {
    return '/pharmacy/dashboard';
  }
  return '/search';
}

export async function getProfile() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return null;
  }

  const userId = data.session.user.id;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile) {
    return null;
  }
  profile.email = data.session.user.email;
  profile.location = '';
  if (profile.upazila) {
    profile.location = profile.upazila + ', ' + profile.district;
  }

  if (profile.role === 'pharmacy') {
    const { data: pharmacy } = await supabase.from('pharmacies').select('*').eq('id', userId).single();
    profile.pharmacy = pharmacy;
  }
  return profile;
}