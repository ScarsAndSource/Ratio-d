import { supabase } from "../supabase/client";


const SYNTHESIS_ENDPOINT = import.meta.env.VITE_SYNTHESIS_ENDPOINT ?? "http://localhost:8787";


export async function deleteAccount(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You need to be signed in to delete your account.");


  const res = await fetch(`${SYNTHESIS_ENDPOINT}/account`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });


  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errBody.error ?? `Account deletion failed (${res.status})`);
  }


  await supabase.auth.signOut();
}
