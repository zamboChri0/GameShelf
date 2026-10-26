const API_URL = "https://gameshelf-api.chri2510.workers.dev/games";

const formRicerca = document.getElementById("form-ricerca");
const campoRicerca = document.getElementById("nome-gioco");
const pulsanteRicerca = document.getElementById("pulsante-ricerca");
const messaggioRicerca = document.getElementById("messaggio-ricerca");
const risultatiRicerca = document.getElementById("risultati-ricerca");

formRicerca.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const titolo = campoRicerca.value.trim();

  if (titolo.length < 2) {
    messaggioRicerca.textContent = "Inserisci almeno 2 caratteri.";
    return;
  }

  risultatiRicerca.replaceChildren();
  messaggioRicerca.textContent = "Ricerca in corso…";
  pulsanteRicerca.disabled = true;

  try {
    const url = new URL(API_URL);
    url.searchParams.set("search", titolo);

    const risposta = await fetch(url);
    const dati = await risposta.json();

    if (!risposta.ok) {
      throw new Error(dati.error || "La ricerca non è riuscita.");
    }

    if (!Array.isArray(dati.results)) {
      throw new Error("Il servizio ha restituito dati non validi.");
    }

    if (dati.results.length === 0) {
      messaggioRicerca.textContent =
        "Nessun gioco trovato. Prova con un altro titolo.";
      return;
    }

    dati.results.forEach((gioco) => {
      risultatiRicerca.appendChild(creaSchedaGioco(gioco));
    });

    messaggioRicerca.textContent =
      `Risultati trovati: ${dati.results.length}.`;
  } catch (errore) {
    console.error("Errore nella ricerca:", errore);

    messaggioRicerca.textContent =
      "Impossibile completare la ricerca. Riprova tra poco.";
  } finally {
    pulsanteRicerca.disabled = false;
  }
});

function creaSchedaGioco(gioco) {
  const scheda = document.createElement("article");
  scheda.className = "scheda scheda-gioco";

  if (gioco.image) {
    const immagine = document.createElement("img");
    immagine.src = gioco.image;
    immagine.alt = `Immagine di ${gioco.name}`;
    immagine.loading = "lazy";

    immagine.addEventListener("error", () => {
      immagine.remove();
    });

    scheda.appendChild(immagine);
  }

  const titolo = document.createElement("h3");
  titolo.textContent = gioco.name;
  scheda.appendChild(titolo);

  const uscita = document.createElement("p");
  uscita.textContent =
    `Uscita: ${gioco.released || "Non disponibile"}`;
  scheda.appendChild(uscita);

  const generi = document.createElement("p");
  generi.textContent =
    `Generi: ${(gioco.genres || []).join(", ") || "Non disponibili"}`;
  scheda.appendChild(generi);

  const piattaforme = document.createElement("p");
  piattaforme.textContent =
    `Piattaforme: ${(gioco.platforms || []).join(", ") || "Non disponibili"}`;
  scheda.appendChild(piattaforme);

  return scheda;
}
