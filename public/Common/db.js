const SUPABASE_URL = "https://oyguhhuumjzrcsrnbgzw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z3VoaHV1bWp6cmNzcm5iZ3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzY4NDEsImV4cCI6MjA4Mzk1Mjg0MX0.VN-KSUtegrx4-kJZP-5UjpMaooGyx58w5yypzzODtkc";

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function getLocalSession() {
  const raw = localStorage.getItem("ultraUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("ultraUser");
    return null;
  }
}

export async function ensureAppUser() {
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    console.warn("No hay usuario autenticado");
    return null;
  }
  const { data: existing, error: selectError } = await sb
    .from("app_users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("Error buscando app_user", selectError);
    return null;
  }

  if (existing) return existing;

  
  const { data, error: insertError } = await sb
    .from("app_users")
    .insert({
      id: user.id,               
      email: user.email,
      display_name: user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error creando app_user", insertError);
    return null;
  }

  return data;
}

export async function createConversation(title = "Nueva conversación") {
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data, error } = await sb
    .from("conversations")
    .insert({
      title,
      created_by: user.id,          
      created_by_email: user.email,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creando conversación", error);
    return null;
  }

  return data;
}

export async function getAllConversations() {
  const appUser = await ensureAppUser();
  if (!appUser) return [];

  const { data, error } = await sb
    .from("conversations")
    .select("*")
    .eq("created_by", appUser.id)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Error cargando conversaciones", error);
    return [];
  }

  return data;
}

export async function saveMessage(conversationId, msg) {
  const appUser = await ensureAppUser();
  if (!appUser) return null;

  const local = getLocalSession();

  const { data, error } = await sb
    .from("messages")
    .insert({
      conversation_id: conversationId,
      author_id: appUser.id,
      author_email: appUser.email,
      author_name: local?.name || appUser.email,
      author_avatar: local?.profilePicture || null,
      creative_agent: msg.creativeAgent || null,
      text: msg.text,
    })
    .select()
    .single();

  if (error) {
    console.error("Error guardando mensaje", error);
    return null;
  }

  await sb
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

export async function getConversationMessages(conversationId) {
  const { data, error } = await sb
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando mensajes", error);
    return [];
  }

  return data;
}
export async function renameConversation(conversationId, newTitle) {
  const { data, error } = await sb
    .from("conversations")
    .update({ title: newTitle })
    .eq("id", conversationId)
    .select(); 

  if (error) {
    console.error("Error renombrando conversación", error);
    return false;
  }

  return data && data.length > 0;
}

export async function deleteConversation(conversationId) {
  const { error: msgError } = await sb
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (msgError) {
    console.error("Error borrando mensajes", msgError);
    return false;
  }

  const { data, error: convError } = await sb
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .select("id");

  if (convError) {
    console.error("Error borrando conversación", convError);
    return false;
  }

  return data.length > 0;
}
