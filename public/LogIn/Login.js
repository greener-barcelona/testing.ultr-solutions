import { sb, saveLocalSession} from "../Common/db.js";

const allowedDomains = ["itsgreener.com", "ffforward.ai", "villamagia.com"];

function isAllowedDomain(email) {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1].toLowerCase();
  return allowedDomains.includes(domain);
}


async function checkUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    saveLocalSession(session.user);
    window.location.href = "../Chat/";
  }
}

// Ejecutar al cargar la página de Login
checkUser();

async function handleAuthRedirect(session) {
  if (session && session.user) {
    const user = session.user;
    if (!isAllowedDomain(user.email)) {
      await sb.auth.signOut();
      localStorage.removeItem("ultraUser");
      return;
    }
    // Guardamos los datos para que el Chat los tenga listos
    saveLocalSession(user);
    window.location.href = "../Chat/";
  }
}
sb.auth.getSession().then(({ data: { session } }) => {
  handleAuthRedirect(session);
});
sb.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
    handleAuthRedirect(session);
  }
});


async function ensureUserInDB(user) {
  const { data: existing } = await sb
    .from("app_users")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();

  if (!existing) {
    await sb.from("app_users").insert({
      email: user.email,
      display_name: user.user_metadata?.full_name || user.email,
      avatar_url: user.user_metadata?.avatar_url || null,
    });
  }
}

sb.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN") {
    const user = session.user;

    console.log("SIGNED_IN con:", user.email);

    if (!isAllowedDomain(user.email)) {
      alert("Dominio no permitido");
      await sb.auth.signOut();
      localStorage.removeItem("ultraUser");
      return;
    }

    await ensureUserInDB(user);
    saveLocalSession(user);

    window.location.href = "../Chat/";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("googleLoginBtn");

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/LogIn/`,
      },
    });
  });
});
