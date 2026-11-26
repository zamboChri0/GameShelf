// GameShelf API - Cloudflare Worker
// Public:        GET  /games?search=...         (RAWG search, unchanged)
// Accounts:      POST /auth/register, /auth/login, /auth/logout
// Collection:    GET  /collezione
//                POST /collezione                  (add to library or wishlist)
//                PATCH  /collezione/:id            (update library item)
//                DELETE /collezione/:id            (remove item)
//                POST /collezione/:id/sposta       (move wishlist item to library)
// Bindings:      env.db (D1 database "gameshelf-db"), env.RAWG_API_KEY (secret)

const ALLOWED_ORIGIN = "https://zambochri0.github.io";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100000;
const GAME_STATES = ["Da iniziare", "In corso", "In pausa", "Finito", "Abbandonato"];
const LISTS = ["libreria", "wishlist"];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origine non consentita." }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      return await route(request, env);
    } catch (error) {
      console.error("Errore interno:", error);
      return json({ error: "Errore interno del servizio." }, 500);
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === "/games") {
    if (method !== "GET") return json({ error: "Metodo non consentito." }, 405);
    return searchGames(url, env);
  }

  if (path.startsWith("/auth/")) {
    if (method !== "POST") return json({ error: "Metodo non consentito." }, 405);
    if (path === "/auth/register") return register(request, env);
    if (path === "/auth/login") return login(request, env);
    if (path === "/auth/logout") return logout(request, env);
    return json({ error: "Percorso non trovato." }, 404);
  }

  if (path === "/collezione/importa") {
    if (method === "POST") return importCollection(request, env);
    return json({ error: "Metodo non consentito." }, 405);
  }

  if (path === "/collezione") {
    if (method === "GET") return listCollection(request, env);
    if (method === "POST") return addItem(request, env);
    return json({ error: "Metodo non consentito." }, 405);
  }

  const match = path.match(/^\/collezione\/([0-9a-f-]+)(\/sposta)?$/);
  if (match) {
    const id = match[1];
    const isMove = Boolean(match[2]);

    if (isMove && method === "POST") return moveToLibrary(request, env, id);
    if (!isMove && method === "PATCH") return updateItem(request, env, id);
    if (!isMove && method === "DELETE") return deleteItem(request, env, id);
    return json({ error: "Metodo non consentito." }, 405);
  }

  return json({
    message: "GameShelf API attiva!",
    esempio: "/games?search=elden%20ring",
  });
}

/* ---------- RAWG search (public, unchanged logic) ---------- */

async function searchGames(url, env) {
  const search = (url.searchParams.get("search") || "").trim();

  if (search.length < 2 || search.length > 100) {
    return json({ error: "Inserisci un titolo tra 2 e 100 caratteri." }, 400);
  }

  if (!env.RAWG_API_KEY) {
    return json({ error: "Chiave API non configurata." }, 500);
  }

  const rawgUrl = new URL("https://api.rawg.io/api/games");
  rawgUrl.searchParams.set("key", env.RAWG_API_KEY);
  rawgUrl.searchParams.set("search", search);
  rawgUrl.searchParams.set("page_size", "6");

  try {
    const response = await fetch(rawgUrl.toString());

    if (!response.ok) {
      return json({
        error: "RAWG non ha completato la ricerca.",
        upstreamStatus: response.status,
      }, 502);
    }

    const data = await response.json();

    const results = (data.results || []).map((game) => ({
      id: game.id,
      name: game.name,
      image: game.background_image,
      released: game.released,
      genres: (game.genres || []).map((genre) => genre.name),
      platforms: (game.platforms || []).map((item) => item.platform.name),
    }));

    return json({ results });
  } catch {
    return json({
      error: "Impossibile contattare RAWG. Riprova più tardi.",
    }, 502);
  }
}

/* ---------- Accounts ---------- */

async function register(request, env) {
  const body = await readJson(request);
  if (!body) return json({ error: "Richiesta non valida." }, 400);

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidEmail(email)) {
    return json({ error: "Email non valida." }, 400);
  }

  if (password.length < 8 || password.length > 200) {
    return json({ error: "La password deve avere tra 8 e 200 caratteri." }, 400);
  }

  const userId = crypto.randomUUID();
  const salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(password, salt);

  try {
    await env.db
      .prepare(
        "INSERT INTO users (id, email, password_hash, password_salt, creato_il) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(userId, email, passwordHash, salt, new Date().toISOString())
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return json({ error: "Esiste già un account con questa email." }, 409);
    }
    throw error;
  }

  const token = await createSession(env, userId);
  return json({ token }, 201);
}

async function login(request, env) {
  const body = await readJson(request);
  if (!body) return json({ error: "Richiesta non valida." }, 400);

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  const user = await env.db
    .prepare("SELECT id, password_hash, password_salt FROM users WHERE email = ?")
    .bind(email)
    .first();

  // Always run the hash, so the response time does not reveal whether the email exists.
  const salt = user
    ? user.password_salt
    : bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const attemptHash = await hashPassword(password, salt);

  const valid = Boolean(user) && safeEqual(attemptHash, user.password_hash);
  if (!valid) {
    return json({ error: "Email o password non corretti." }, 401);
  }

  const token = await createSession(env, user.id);
  return json({ token });
}

async function logout(request, env) {
  const token = getBearerToken(request);

  if (token) {
    await env.db
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256Hex(token))
      .run();
  }

  return json({ ok: true });
}

async function createSession(env, userId) {
  const token = randomHex(32);

  await env.db
    .prepare("INSERT INTO sessions (token_hash, user_id, scade_il) VALUES (?, ?, ?)")
    .bind(await sha256Hex(token), userId, sessionExpiry())
    .run();

  return token;
}

// Returns the user id for a valid session, or null.
// Each valid use extends the session by SESSION_DAYS.
async function getUserId(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;

  const tokenHash = await sha256Hex(token);

  const session = await env.db
    .prepare("SELECT user_id, scade_il FROM sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .first();

  if (!session) return null;

  if (session.scade_il <= new Date().toISOString()) {
    await env.db
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
    return null;
  }

  await env.db
    .prepare("UPDATE sessions SET scade_il = ? WHERE token_hash = ?")
    .bind(sessionExpiry(), tokenHash)
    .run();

  return session.user_id;
}

/* ---------- Collection (library and wishlist) ---------- */

async function listCollection(request, env) {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: "Accesso richiesto." }, 401);

  const { results } = await env.db
    .prepare("SELECT * FROM giochi WHERE user_id = ? ORDER BY aggiunto_il DESC")
    .bind(userId)
    .all();

  const items = results.map(toGame);

  return json({
    libreria: items.filter((item) => item.lista === "libreria"),
    wishlist: items.filter((item) => item.lista === "wishlist"),
  });
}

async function addItem(request, env) {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: "Accesso richiesto." }, 401);

  const body = await readJson(request);
  if (!body) return json({ error: "Richiesta non valida." }, 400);

  if (!LISTS.includes(body.lista)) {
    return json({ error: "Lista non valida." }, 400);
  }

  if (!Number.isSafeInteger(body.rawgId) || body.rawgId <= 0) {
    return json({ error: "Gioco non valido." }, 400);
  }

  const name = cleanText(body.nome, 200);
  const platform = cleanText(body.piattaforma, 50);

  if (!name || !platform) {
    return json({ error: "Titolo e piattaforma sono obbligatori." }, 400);
  }

  const image = typeof body.immagine === "string" && /^https?:\/\//.test(body.immagine)
    ? body.immagine
    : null;

  const genres = Array.isArray(body.generi)
    ? body.generi.filter((genre) => typeof genre === "string").slice(0, 20)
    : [];

  const state = body.lista === "libreria"
    ? (GAME_STATES.includes(body.stato) ? body.stato : "Da iniziare")
    : null;

  try {
    await env.db
      .prepare(
        `INSERT INTO giochi
          (id, user_id, lista, rawg_id, nome, immagine, generi, piattaforma, stato, aggiunto_il)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        userId,
        body.lista,
        body.rawgId,
        name,
        image,
        JSON.stringify(genres),
        platform,
        state,
        new Date().toISOString()
      )
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return json({
        error: "Questo gioco è già nella libreria o nella wishlist su questa piattaforma.",
      }, 409);
    }
    throw error;
  }

  return json({ ok: true }, 201);
}

async function updateItem(request, env, id) {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: "Accesso richiesto." }, 401);

  const body = await readJson(request);
  if (!body) return json({ error: "Richiesta non valida." }, 400);

  const row = await env.db
    .prepare("SELECT * FROM giochi WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();

  if (!row) {
    return json({ error: "Gioco non trovato nella tua collezione." }, 404);
  }

  const item = toGame(row);

  const editableFields = [
    "stato", "platino", "preferito", "voto", "note",
    "dataInizio", "dataFine", "oreGiocate", "minutiGiocati",
  ];

  for (const field of editableFields) {
    if (Object.hasOwn(body, field)) {
      item[field] = body[field];
    }
  }

  // Empty time values are stored as 0, as in the frontend.
  item.oreGiocate = item.oreGiocate ?? 0;
  item.minutiGiocati = item.minutiGiocati ?? 0;

  const validationError = validateItem(item);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  await env.db
    .prepare(
      `UPDATE giochi SET
         stato = ?, platino = ?, preferito = ?, voto = ?, note = ?,
         data_inizio = ?, data_fine = ?, ore_giocate = ?, minuti_giocati = ?
       WHERE id = ? AND user_id = ?`
    )
    .bind(
      item.stato,
      item.platino ? 1 : 0,
      item.preferito ? 1 : 0,
      item.voto,
      item.note,
      item.dataInizio,
      item.dataFine,
      item.oreGiocate,
      item.minutiGiocati,
      id,
      userId
    )
    .run();

  return json({ ok: true });
}

async function deleteItem(request, env, id) {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: "Accesso richiesto." }, 401);

  const result = await env.db
    .prepare("DELETE FROM giochi WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();

  if (result.meta.changes === 0) {
    return json({ error: "Gioco non trovato nella tua collezione." }, 404);
  }

  return json({ ok: true });
}

async function moveToLibrary(request, env, id) {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: "Accesso richiesto." }, 401);

  const result = await env.db
    .prepare(
      `UPDATE giochi SET lista = 'libreria', stato = 'Da iniziare'
       WHERE id = ? AND user_id = ? AND lista = 'wishlist'`
    )
    .bind(id, userId)
    .run();

  if (result.meta.changes === 0) {
    return json({ error: "Gioco non trovato nella wishlist." }, 404);
  }

  return json({ ok: true });
}

const MAX_IMPORT_ITEMS = 2000;

// Replaces the user's library (and wishlist, when the backup has one).
// Everything runs in one D1 batch: either the whole import is saved or nothing changes.
async function importCollection(request, env) {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: "Accesso richiesto." }, 401);

  const body = await readJson(request);
  if (!body) return json({ error: "Richiesta non valida." }, 400);

  if (!Array.isArray(body.giochi) || body.giochi.length > MAX_IMPORT_ITEMS) {
    return json({ error: "Il backup non contiene una lista di giochi valida." }, 400);
  }

  const hasWishlist = Array.isArray(body.wishlist);

  if (
    body.wishlist !== null &&
    body.wishlist !== undefined &&
    !hasWishlist
  ) {
    return json({ error: "La wishlist nel backup non è valida." }, 400);
  }

  if (hasWishlist && body.wishlist.length > MAX_IMPORT_ITEMS) {
    return json({ error: "La wishlist nel backup è troppo grande." }, 400);
  }

  let libraryItems;
  let wishlistItems = [];

  try {
    libraryItems = body.giochi.map((raw) => prepareImportedItem(raw, "libreria"));
    wishlistItems = hasWishlist
      ? body.wishlist.map((raw) => prepareImportedItem(raw, "wishlist"))
      : [];
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const insertSql = `INSERT INTO giochi
    (id, user_id, lista, rawg_id, nome, immagine, generi, piattaforma, stato,
     platino, preferito, voto, note, data_inizio, data_fine,
     ore_giocate, minuti_giocati, aggiunto_il)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  // A v1 backup has no wishlist: in that case only the library is replaced.
  const statements = [
    hasWishlist
      ? env.db.prepare("DELETE FROM giochi WHERE user_id = ?").bind(userId)
      : env.db
          .prepare("DELETE FROM giochi WHERE user_id = ? AND lista = 'libreria'")
          .bind(userId),
  ];

  for (const item of [...libraryItems, ...wishlistItems]) {
    statements.push(
      env.db.prepare(insertSql).bind(
        crypto.randomUUID(),
        userId,
        item.lista,
        item.rawgId,
        item.nome,
        item.immagine,
        JSON.stringify(item.generi),
        item.piattaforma,
        item.stato,
        item.platino ? 1 : 0,
        item.preferito ? 1 : 0,
        item.voto,
        item.note,
        item.dataInizio,
        item.dataFine,
        item.oreGiocate,
        item.minutiGiocati,
        item.aggiuntoIl
      )
    );
  }

  try {
    await env.db.batch(statements);
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return json({
        error: "Il backup contiene giochi duplicati sulla stessa piattaforma.",
      }, 409);
    }
    throw error;
  }

  return json({
    ok: true,
    libreria: libraryItems.length,
    wishlist: hasWishlist ? wishlistItems.length : null,
  });
}

// Validates one game from a backup and maps it to the database shape.
function prepareImportedItem(raw, lista) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Il backup contiene un gioco non valido.");
  }

  const isLibrary = lista === "libreria";

  const item = {
    lista,
    rawgId: raw.rawgId,
    nome: cleanText(raw.nome, 200),
    immagine: typeof raw.immagine === "string" && /^https?:\/\//.test(raw.immagine)
      ? raw.immagine
      : null,
    generi: Array.isArray(raw.generi)
      ? raw.generi.filter((genre) => typeof genre === "string").slice(0, 20)
      : [],
    piattaforma: cleanText(raw.piattaforma, 50),
    stato: isLibrary ? raw.stato : null,
    platino: isLibrary ? (raw.platino ?? false) : false,
    preferito: isLibrary ? (raw.preferito ?? false) : false,
    voto: isLibrary ? (raw.voto ?? null) : null,
    note: isLibrary && typeof raw.note === "string" ? raw.note : "",
    dataInizio: isLibrary ? (raw.dataInizio ?? null) : null,
    dataFine: isLibrary ? (raw.dataFine ?? null) : null,
    oreGiocate: isLibrary ? (raw.oreGiocate ?? 0) : 0,
    minutiGiocati: isLibrary ? (raw.minutiGiocati ?? 0) : 0,
    aggiuntoIl: typeof raw.aggiuntoIl === "string"
      ? raw.aggiuntoIl
      : new Date().toISOString(),
  };

  if (!Number.isSafeInteger(item.rawgId) || item.rawgId <= 0 || !item.nome || !item.piattaforma) {
    throw new Error("Il backup contiene un gioco con dati obbligatori mancanti.");
  }

  const validationError = validateItem(item);
  if (validationError) {
    throw new Error(validationError);
  }

  return item;
}

/* ---------- Validation ---------- */

function validateItem(item) {
  if (item.lista === "libreria" && !GAME_STATES.includes(item.stato)) {
    return "Stato non valido.";
  }

  if (item.lista === "wishlist" && item.stato !== null) {
    return "Lo stato si imposta solo per i giochi in libreria.";
  }

  if (typeof item.platino !== "boolean") {
    return "Il valore del platino non è valido.";
  }

  if (item.platino && !/playstation/i.test(item.piattaforma)) {
    return "Il platino è disponibile solo su PlayStation.";
  }

  if (typeof item.preferito !== "boolean") {
    return "Il valore del preferito non è valido.";
  }

  if (!isValidRating(item.voto)) {
    return "Il voto deve essere da 1 a 5, con incrementi di 0,5.";
  }

  if (typeof item.note !== "string" || item.note.length > 2000) {
    return "Le note sono troppo lunghe.";
  }

  if (!areValidDates(item.dataInizio, item.dataFine)) {
    return "Controlla le date: devono essere valide e la fine non può precedere l'inizio.";
  }

  if (!isNonNegativeInteger(item.oreGiocate) || !isNonNegativeInteger(item.minutiGiocati, 59)) {
    return "Il tempo giocato non è valido.";
  }

  return null;
}

function isValidRating(value) {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 1 &&
      value <= 5 &&
      Number.isInteger(value * 2)
    )
  );
}

function isValidDate(value) {
  if (value === null) return true;

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000-")
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function areValidDates(start, end) {
  return (
    isValidDate(start) &&
    isValidDate(end) &&
    (start === null || end === null || end >= start)
  );
}

function isNonNegativeInteger(value, max = Infinity) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max;
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/* ---------- Mapping DB row -> frontend object ---------- */

function toGame(row) {
  return {
    id: row.id,
    lista: row.lista,
    rawgId: row.rawg_id,
    nome: row.nome,
    immagine: row.immagine,
    generi: JSON.parse(row.generi),
    piattaforma: row.piattaforma,
    stato: row.stato,
    platino: row.platino === 1,
    preferito: row.preferito === 1,
    voto: row.voto,
    note: row.note,
    dataInizio: row.data_inizio,
    dataFine: row.data_fine,
    oreGiocate: row.ore_giocate,
    minutiGiocati: row.minuti_giocati,
    aggiuntoIl: row.aggiunto_il,
  };
}

/* ---------- Crypto and request helpers ---------- */

function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer ([0-9a-f]{64})$/);
  return match ? match[1] : null;
}

function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body !== null && typeof body === "object" && !Array.isArray(body)
      ? body
      : null;
  } catch {
    return null;
  }
}

async function hashPassword(password, saltBase64) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(saltBase64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256
  );

  return bytesToBase64(new Uint8Array(bits));
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(digest));
}

function randomHex(byteLength) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return difference === 0;
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(text) {
  const binary = atob(text);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
