// Client for the GameShelf API (Cloudflare Worker).
// Stores the session token in localStorage and sends it with account requests.

const API_BASE_URL = "https://gameshelf-api.chri2510.workers.dev";
const CHIAVE_TOKEN = "gameshelf:token:v1";

class ErroreApi extends Error {
  constructor(messaggio, stato) {
    super(messaggio);
    this.name = "ErroreApi";
    this.stato = stato;
  }
}

function leggiToken() {
  return localStorage.getItem(CHIAVE_TOKEN);
}

function salvaToken(token) {
  localStorage.setItem(CHIAVE_TOKEN, token);
}

function rimuoviToken() {
  localStorage.removeItem(CHIAVE_TOKEN);
}

function haAccesso() {
  return Boolean(leggiToken());
}

async function chiamaApi(percorso, { metodo = "GET", corpo, autenticato = false } = {}) {
  const intestazioni = {};

  if (corpo !== undefined) {
    intestazioni["Content-Type"] = "application/json";
  }

  if (autenticato) {
    const token = leggiToken();

    if (!token) {
      throw new ErroreApi("Accesso richiesto.", 401);
    }

    intestazioni["Authorization"] = `Bearer ${token}`;
  }

  let risposta;

  try {
    risposta = await fetch(API_BASE_URL + percorso, {
      method: metodo,
      headers: intestazioni,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroreApi(
      "Impossibile contattare il servizio. Controlla la connessione.",
      0
    );
  }

  let dati = {};

  try {
    dati = await risposta.json();
  } catch {
    dati = {};
  }

  if (!risposta.ok) {
    // A rejected session means the saved token is no longer valid.
    if (risposta.status === 401 && autenticato) {
      rimuoviToken();
    }

    throw new ErroreApi(dati.error || "Operazione non riuscita.", risposta.status);
  }

  return dati;
}

async function registraAccount(email, password) {
  const dati = await chiamaApi("/auth/register", {
    metodo: "POST",
    corpo: { email, password },
  });

  salvaToken(dati.token);
}

async function accedi(email, password) {
  const dati = await chiamaApi("/auth/login", {
    metodo: "POST",
    corpo: { email, password },
  });

  salvaToken(dati.token);
}

async function esci() {
  try {
    if (haAccesso()) {
      await chiamaApi("/auth/logout", { metodo: "POST", autenticato: true });
    }
  } catch {
    // The local session is removed anyway.
  }

  rimuoviToken();
}

function caricaCollezione() {
  return chiamaApi("/collezione", { autenticato: true });
}

function aggiungiAllaCollezione(gioco) {
  return chiamaApi("/collezione", {
    metodo: "POST",
    corpo: gioco,
    autenticato: true,
  });
}

function aggiornaElemento(id, modifiche) {
  return chiamaApi(`/collezione/${id}`, {
    metodo: "PATCH",
    corpo: modifiche,
    autenticato: true,
  });
}

function eliminaElemento(id) {
  return chiamaApi(`/collezione/${id}`, {
    metodo: "DELETE",
    autenticato: true,
  });
}

function spostaInLibreria(id) {
  return chiamaApi(`/collezione/${id}/sposta`, {
    metodo: "POST",
    autenticato: true,
  });
}
