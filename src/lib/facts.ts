// src/lib/facts.ts
//
// Owner-scoped CRUD for health_facts + read/update for the patient profile.
// RLS enforces that a user can only touch their own rows, so we don't need to
// pass user_id on reads — but inserts must set it (the WITH CHECK policy).

import { supabase } from './supabase';
import type { FactType, HealthFact, Profile } from '../types/facts';

export async function listFacts(): Promise<HealthFact[]> {
  const { data, error } = await supabase
    .from('health_facts')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HealthFact[];
}

export async function addFact(
  userId: string,
  type: FactType,
  label: string,
  detail: string | null,
): Promise<HealthFact> {
  const { data, error } = await supabase
    .from('health_facts')
    .insert({ user_id: userId, type, label, detail })
    .select()
    .single();
  if (error) throw error;
  return data as HealthFact;
}

export async function deleteFact(id: string): Promise<void> {
  const { error } = await supabase.from('health_facts').delete().eq('id', id);
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  fields: { full_name?: string | null; dob?: string | null; blood_type?: string | null },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw error;
}
