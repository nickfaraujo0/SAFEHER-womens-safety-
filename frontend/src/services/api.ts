import { supabase } from "../utils/supabase/client";

// --- User Authentication ---

export const registerUser = async (name: string, phone: string, aadhaar: string) => {
  // Upsert by phone or aadhaar to avoid duplicates
  const { error: upsertError } = await supabase
    .from("users")
    .upsert({ name, phone, aadhaar }, { onConflict: "phone" });
  
  if (upsertError) throw upsertError;

  // Fetch user row to store locally
  const { data: userRow, error: fetchError } = await supabase
    .from("users")
    .select("id, name, phone")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();
  
  if (fetchError) throw fetchError;
  return userRow;
};

export const loginUser = async (phone: string, aadhaar: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .eq("phone", phone)
    .eq("aadhaar", aadhaar)
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  if (!data) throw new Error("No account found. Please register first.");
  
  return data;
};

// --- Emergency Contacts ---

export const getUserContacts = async (userId: string) => {
  const { data, error } = await supabase
    .from("contacts")
    .select("phone")
    .eq("user_id", userId);
    
  if (error) throw error;
  return data ? data.map((c: any) => String(c.phone)).filter(Boolean) : [];
};

// --- Safety Reports / Map Markers ---

export const getUserSafetyReports = async (userId: string) => {
  const { data, error } = await supabase
    .from("safety_reports")
    .select("id, latitude, longitude, safety_level, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const addSafetyReport = async (userId: string, lat: number, lng: number, safetyLevel: string, description?: string | null) => {
  const { data, error } = await supabase
    .from("safety_reports")
    .insert({
      user_id: userId,
      latitude: lat.toString(),
      longitude: lng.toString(),
      safety_level: safetyLevel,
      description: description || null
    })
    .select("id, latitude, longitude, safety_level, description, created_at")
    .single();

  if (error) throw error;
  return data;
};
