"use client";

import { supabase } from "./supabase";

export async function requireAuth() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
