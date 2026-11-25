const listaWishlist = document.getElementById("lista-wishlist");
const messaggioWishlist = document.getElementById("messaggio-wishlist");

function mostraWishlist() {
  listaWishlist.replaceChildren();

  try {
    const giochi = leggiWishlist().slice().reverse();

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

  trasferisci.addEventListener("click", () => {
    const confermato = window.confirm(
      `Vuoi spostare "${gioco.nome}" nella libreria ` +
      `su ${gioco.piattaforma}, con stato Da iniziare?`
    );

    if (!confermato) {
      return;
    }

    try {
      const giaInLibreria = leggiLibreria().some((elemento) =>
        elemento.rawgId === gioco.rawgId &&
        elemento.piattaforma === gioco.piattaforma
      );

      if (!giaInLibreria) {
        const risultato = aggiungiAllaLibreria(
          {
            id: gioco.rawgId,
            name: gioco.nome,
            image: gioco.immagine,
            genres: gioco.generi,
          },
          gioco.piattaforma,
          "Da iniziare"
        );

        if (!risultato.aggiunto) {
          throw new Error(risultato.messaggio);
        }
      }

      rimuoviDallaWishlist(gioco.id);
      mostraWishlist();

      messaggioWishlist.textContent += giaInLibreria
        ? " Il gioco era già nella libreria: rimossa la voce dalla wishlist."
        : " Gioco spostato nella libreria.";
    } catch (errore) {
      console.error("Errore nel trasferimento:", errore);

      messaggioWishlist.textContent =
        "Trasferimento non completato. " +
        "Controlla Libreria e Wishlist prima di riprovare.";
    }
  });

  rimuovi.addEventListener("click", () => {
    const confermato = window.confirm(
      `Vuoi rimuovere "${gioco.nome}" dalla wishlist?`
    );

    if (!confermato) {
      return;
    }

    try {
      rimuoviDallaWishlist(gioco.id);
      mostraWishlist();

      messaggioWishlist.textContent +=
        " Gioco rimosso dalla wishlist.";
    } catch (errore) {
      console.error("Errore nella rimozione:", errore);

      messaggioWishlist.textContent =
        "Impossibile rimuovere il gioco dalla wishlist.";
    }
  });

  azioni.append(trasferisci, rimuovi);
  scheda.append(titolo, piattaforma, azioni);

  return scheda;
}

mostraWishlist();