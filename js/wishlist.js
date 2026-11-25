const listaWishlist = document.getElementById("lista-wishlist");
const messaggioWishlist = document.getElementById("messaggio-wishlist");

// Items of the account's wishlist, loaded from the API.
let wishlist = [];

async function caricaWishlist() {
  try {
    const dati = await caricaCollezione();
    wishlist = dati.wishlist;
    mostraWishlist();
  } catch (errore) {
    if (errore.stato === 401) {
      window.location.href = "accesso.html";
      return;
    }

    console.error("Errore nel caricamento della wishlist:", errore);
    messaggioWishlist.textContent = errore.message;
  }
}

function mostraWishlist() {
  listaWishlist.replaceChildren();

  try {
    const giochi = wishlist.slice().reverse();

    messaggioWishlist.textContent =
      `Giochi nella wishlist: ${giochi.length}.`;

    if (giochi.length === 0) {
      const vuoto = document.createElement("p");
      vuoto.className = "libreria-nessun-risultato";
      vuoto.textContent =
        "La wishlist è vuota. Cerca un gioco nella pagina Giochi " +
        "e premi Aggiungi alla wishlist.";

      listaWishlist.appendChild(vuoto);
      return;
    }

    const frammento = document.createDocumentFragment();

    giochi.forEach((gioco) => {
      frammento.appendChild(creaSchedaWishlist(gioco));
    });

    listaWishlist.appendChild(frammento);
  } catch (errore) {
    console.error("Errore nel caricamento della wishlist:", errore);

    messaggioWishlist.textContent =
      "Impossibile leggere la wishlist salvata.";
  }
}

function creaSchedaWishlist(gioco) {
  const scheda = document.createElement("article");
  scheda.className = "scheda scheda-gioco";

  if (gioco.immagine) {
    const immagine = document.createElement("img");
    immagine.src = gioco.immagine;
    immagine.alt = `Immagine di ${gioco.nome}`;
    immagine.loading = "lazy";

    immagine.addEventListener("error", () => {
      immagine.remove();
    });

    scheda.appendChild(immagine);
  }

  const titolo = document.createElement("h2");
  titolo.className = "titolo-scheda-wishlist";
  titolo.textContent = gioco.nome;

  const piattaforma = document.createElement("p");
  piattaforma.textContent = gioco.piattaforma;

  const azioni = document.createElement("div");
  azioni.className = "form-aggiunta";

  const trasferisci = document.createElement("button");
  trasferisci.type = "button";
  trasferisci.textContent = "Sposta nella libreria";

  const rimuovi = document.createElement("button");
  rimuovi.type = "button";
  rimuovi.className = "azione-wishlist-secondaria";
  rimuovi.textContent = "Rimuovi dalla wishlist";

  trasferisci.addEventListener("click", async () => {
    const confermato = window.confirm(
      `Vuoi spostare "${gioco.nome}" nella libreria ` +
      `su ${gioco.piattaforma}, con stato Da iniziare?`
    );

    if (!confermato) {
      return;
    }

    try {
      await spostaInLibreria(gioco.id);
      await caricaWishlist();

      messaggioWishlist.textContent += " Gioco spostato nella libreria.";
    } catch (errore) {
      console.error("Errore nel trasferimento:", errore);

      if (errore.stato === 401) {
        window.location.href = "accesso.html";
        return;
      }

      messaggioWishlist.textContent =
        "Trasferimento non completato. " + errore.message;
    }
  });

  rimuovi.addEventListener("click", async () => {
    const confermato = window.confirm(
      `Vuoi rimuovere "${gioco.nome}" dalla wishlist?`
    );

    if (!confermato) {
      return;
    }

    try {
      await eliminaElemento(gioco.id);
      await caricaWishlist();

      messaggioWishlist.textContent +=
        " Gioco rimosso dalla wishlist.";
    } catch (errore) {
      console.error("Errore nella rimozione:", errore);

      if (errore.stato === 401) {
        window.location.href = "accesso.html";
        return;
      }

      messaggioWishlist.textContent =
        "Impossibile rimuovere il gioco dalla wishlist.";
    }
  });

  azioni.append(trasferisci, rimuovi);
  scheda.append(titolo, piattaforma, azioni);

  return scheda;
}

if (haAccesso()) {
  caricaWishlist();
} else {
  window.location.href = "accesso.html";
}
