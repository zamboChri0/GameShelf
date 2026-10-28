const listaLibreria = document.getElementById("lista-libreria");
const messaggioLibreria = document.getElementById("messaggio-libreria");

const ricercaLibreria = document.getElementById("ricerca-libreria");
const filtroStato = document.getElementById("filtro-stato");
const filtroPiattaforma = document.getElementById("filtro-piattaforma");
const filtroPlatino = document.getElementById("filtro-platino");
const ordineLibreria = document.getElementById("ordine-libreria");
const azzeraFiltri = document.getElementById("azzera-filtri");
const filtroPreferiti = document.getElementById("filtro-preferiti");


messaggioLibreria.setAttribute("role", "status");

ricercaLibreria.addEventListener("input", mostraLibreria);

[
  filtroStato,
  filtroPiattaforma,
  filtroPlatino,
  filtroPreferiti,
  ordineLibreria,
].forEach((controllo) => {

  controllo.addEventListener("change", mostraLibreria);
});

azzeraFiltri.addEventListener("click", () => {
  ricercaLibreria.value = "";
  filtroStato.value = "";
  filtroPiattaforma.value = "";
  filtroPlatino.checked = false;
  filtroPreferiti.checked = false;
  ordineLibreria.value = "recenti";

  mostraLibreria();
});

function aggiornaFiltroPiattaforme(giochi) {
  const selezionata = filtroPiattaforma.value;

  const piattaforme = [
    ...new Set(
      giochi
        .map((gioco) => gioco.piattaforma)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "it"));

  filtroPiattaforma.replaceChildren(
    new Option("Tutte le piattaforme", "")
  );

  piattaforme.forEach((piattaforma) => {
    filtroPiattaforma.add(
      new Option(piattaforma, piattaforma)
    );
  });

  if (piattaforme.includes(selezionata)) {
    filtroPiattaforma.value = selezionata;
  }
}

function mostraLibreria() {
  listaLibreria.replaceChildren();

  try {
    const giochi = leggiLibreria();

    aggiornaFiltroPiattaforme(giochi);

    if (giochi.length === 0) {
      messaggioLibreria.textContent =
        "La tua libreria è vuota. Cerca un gioco e aggiungilo!";
      return;
    }

    const testo = ricercaLibreria.value
      .trim()
      .toLocaleLowerCase("it");

    const filtrati = giochi.filter((gioco) => {
      const corrispondeTitolo = String(gioco.nome ?? "")
        .toLocaleLowerCase("it")
        .includes(testo);

      const corrispondeStato =
        filtroStato.value === "" ||
        gioco.stato === filtroStato.value;

      const corrispondePiattaforma =
        filtroPiattaforma.value === "" ||
        gioco.piattaforma === filtroPiattaforma.value;

      const corrispondePlatino =
        !filtroPlatino.checked ||
        (
          /playstation/i.test(gioco.piattaforma) &&
          gioco.platino === true
        );

      const corrispondePreferito =
        !filtroPreferiti.checked ||
        gioco.preferito === true;

      return (
        corrispondeTitolo &&
        corrispondeStato &&
        corrispondePiattaforma &&
        corrispondePlatino &&
        corrispondePreferito
      );

    });

    if (ordineLibreria.value === "titolo") {
      filtrati.sort((a, b) =>
        String(a.nome ?? "").localeCompare(
          String(b.nome ?? ""),
          "it",
          { sensitivity: "base", numeric: true }
        )
      );
    } else {
      filtrati.reverse();
    }

    messaggioLibreria.textContent =
      `Giochi mostrati: ${filtrati.length} su ${giochi.length}.`;

    if (filtrati.length === 0) {
      const messaggioVuoto = document.createElement("p");
      messaggioVuoto.className = "libreria-nessun-risultato";
      messaggioVuoto.textContent =
        "Nessun gioco corrisponde ai filtri. Prova a cambiarli o ad azzerarli.";

      listaLibreria.appendChild(messaggioVuoto);
      return;
    }

    const frammento = document.createDocumentFragment();

    filtrati.forEach((gioco) => {
      frammento.appendChild(creaSchedaLibreria(gioco));
    });

    listaLibreria.appendChild(frammento);
  } catch (errore) {
    console.error("Errore nel caricamento della libreria:", errore);

    messaggioLibreria.textContent =
      "Impossibile leggere la libreria salvata.";
  }
}

function creaVisualizzazioneVoto(voto) {
  const contenitore = document.createElement("div");
  contenitore.className = "valutazione-gioco";

  if (voto === null || voto === undefined) {
    contenitore.classList.add("valutazione-assente");
    contenitore.textContent = "Non valutato";
    return contenitore;
  }

  if (!votoValido(voto)) {
    contenitore.textContent = "Voto da aggiornare";
    return contenitore;
  }

  const stelle = document.createElement("span");
  stelle.className = "stelle-voto";
  stelle.setAttribute("aria-hidden", "true");

  for (let posizione = 1; posizione <= 5; posizione++) {
    const stella = document.createElement("span");
    stella.className = "stella-voto";

    const sfondo = document.createElement("span");
    sfondo.className = "stella-sfondo";
    sfondo.textContent = "★";

    const riempimento = document.createElement("span");
    riempimento.className = "stella-riempimento";
    riempimento.textContent = "★";

    const frazione = Math.max(
      0,
      Math.min(1, voto - (posizione - 1))
    );

    riempimento.style.width = `${frazione * 100}%`;

    stella.append(sfondo, riempimento);
    stelle.appendChild(stella);
  }

  const testo = document.createElement("span");
  testo.className = "numero-voto";
  testo.textContent = `${formattaVoto(voto)}/5`;

  const descrizione = document.createElement("span");
  descrizione.className = "solo-lettori-schermo";
  descrizione.textContent = "Voto personale: ";

  contenitore.append(descrizione, stelle, testo);

  return contenitore;
}


function creaSchedaLibreria(gioco) {
  const scheda = document.createElement("article");
  scheda.className = "scheda scheda-gioco";

  if (gioco.immagine) {
    const contenitoreImmagine = document.createElement("div");
    contenitoreImmagine.className = "contenitore-immagine";

    const immagine = document.createElement("img");
    immagine.src = gioco.immagine;
    immagine.alt = `Immagine di ${gioco.nome}`;
    immagine.loading = "lazy";

    immagine.addEventListener("error", () => {
      contenitoreImmagine.remove();
    });

    contenitoreImmagine.appendChild(immagine);
    scheda.appendChild(contenitoreImmagine);
  }


  const intestazione = document.createElement("div");
  intestazione.className = "intestazione-scheda";

  const titolo = document.createElement("h3");
  titolo.textContent = gioco.nome;

  const pulsanteModifica = document.createElement("button");
  pulsanteModifica.type = "button";
  pulsanteModifica.className = "pulsante-modifica";
  pulsanteModifica.setAttribute("aria-label", `Modifica ${gioco.nome}`);
  pulsanteModifica.textContent = "Modifica";

  pulsanteModifica.addEventListener("click", () => {
    apriModificaGioco(gioco);
  });

  const pulsantePreferito = document.createElement("button");
  pulsantePreferito.type = "button";
  pulsantePreferito.className = "pulsante-preferito";
  pulsantePreferito.dataset.giocoId = gioco.id;

  const preferito = gioco.preferito === true;

  pulsantePreferito.classList.toggle("attivo", preferito);
  pulsantePreferito.setAttribute(
    "aria-pressed",
    String(preferito)
  );
  pulsantePreferito.setAttribute(
    "aria-label",
    `Preferito: ${gioco.nome}`
  );
  pulsantePreferito.title = preferito
    ? "Rimuovi dai preferiti"
    : "Aggiungi ai preferiti";

  const iconaCuore = document.createElement("span");
  iconaCuore.setAttribute("aria-hidden", "true");
  iconaCuore.textContent = preferito ? "♥" : "♡";

  pulsantePreferito.appendChild(iconaCuore);

  pulsantePreferito.addEventListener("click", () => {
    try {
      const attuale = leggiLibreria().find(
        (elemento) => elemento.id === gioco.id
      );

      if (!attuale) {
        throw new Error("Gioco non trovato.");
      }

      const nuovoValore = attuale.preferito !== true;

      aggiornaGioco(gioco.id, {
        preferito: nuovoValore,
      });

      mostraLibreria();

      const nuovoPulsante = [
        ...listaLibreria.querySelectorAll(".pulsante-preferito"),
      ].find(
        (pulsante) => pulsante.dataset.giocoId === gioco.id
      );

      if (nuovoPulsante) {
        nuovoPulsante.focus({ preventScroll: true });
      } else {
        filtroPreferiti.focus({ preventScroll: true });
      }

      messaggioLibreria.textContent += nuovoValore
        ? " Gioco aggiunto ai preferiti."
        : " Gioco rimosso dai preferiti.";
    } catch (errore) {
      console.error("Errore preferiti:", errore);

      messaggioLibreria.textContent =
        "Impossibile aggiornare il preferito. Riprova.";
    }
  });

  const azioniScheda = document.createElement("div");
  azioniScheda.className = "azioni-scheda";

  azioniScheda.append(
    pulsantePreferito,
    pulsanteModifica
  );

  intestazione.append(titolo, azioniScheda);


  const piattaforma = document.createElement("p");
  piattaforma.className = "piattaforma-gioco";
  piattaforma.textContent = gioco.piattaforma;

  const badgeStato = document.createElement("span");
  badgeStato.className = "badge badge-stato";

  const classiStato = {
    "Da iniziare": "stato-da-iniziare",
    "In corso": "stato-in-corso",
    "In pausa": "stato-in-pausa",
    "Finito": "stato-finito",
    "Abbandonato": "stato-abbandonato",
  };


  badgeStato.classList.add(classiStato[gioco.stato] || "stato-da-iniziare");
  badgeStato.textContent = gioco.stato;

  const badgePiattaforma = document.createElement("span");
  badgePiattaforma.className = "badge badge-piattaforma";
  badgePiattaforma.textContent = gioco.piattaforma;

  const badgePlatino = document.createElement("span");
  badgePlatino.className = "badge badge-platino";
  badgePlatino.textContent = "🏆 Platino";

  const badges = document.createElement("div");
  badges.className = "badges-gioco";
  badges.appendChild(badgeStato);
  badges.appendChild(badgePiattaforma);

  if (/playstation/i.test(gioco.piattaforma) && gioco.platino) {
    badges.appendChild(badgePlatino);
  }

  const valutazione = creaVisualizzazioneVoto(gioco.voto);

  scheda.append(
    intestazione,
    piattaforma,
    valutazione,
    badges
  );

  return scheda;
}

function apriModificaGioco(gioco) {
  const overlay = document.createElement("div");
  overlay.className = "overlay-modifica";

  const finestra = document.createElement("div");
  finestra.className = "finestra-modifica";
  finestra.setAttribute("role", "dialog");
  finestra.setAttribute("aria-modal", "true");
  finestra.setAttribute("aria-labelledby", "titolo-modifica");

  const titolo = document.createElement("h2");
  titolo.id = "titolo-modifica";
  titolo.textContent = `Modifica ${gioco.nome}`;

  const piattaforma = document.createElement("p");
  piattaforma.className = "piattaforma-gioco";
  piattaforma.textContent = gioco.piattaforma;

  const form = document.createElement("form");
  form.className = "form-aggiunta";

  const labelStato = document.createElement("label");
  labelStato.textContent = "Stato";

  const selectStato = document.createElement("select");

  ["Da iniziare", "In corso", "In pausa", "Finito", "Abbandonato"].forEach((stato) => {
    const opzione = document.createElement("option");
    opzione.value = stato;
    opzione.textContent = stato;
    selectStato.appendChild(opzione);
  });

  selectStato.value = gioco.stato;
  labelStato.appendChild(selectStato);

  const supportaPlatino = /playstation/i.test(gioco.piattaforma);

  const labelPlatino = document.createElement("label");
  labelPlatino.className = "opzione-platino";

  const checkboxPlatino = document.createElement("input");
  checkboxPlatino.type = "checkbox";
  checkboxPlatino.checked = Boolean(gioco.platino);
  checkboxPlatino.disabled = !supportaPlatino;

  const testoPlatino = document.createElement("span");
  testoPlatino.textContent = supportaPlatino
    ? "🏆 Platino ottenuto"
    : "Platino non disponibile su questa piattaforma";

  labelPlatino.append(checkboxPlatino, testoPlatino);

  const labelVoto = document.createElement("label");
  labelVoto.textContent = "Voto personale";

  const selectVoto = document.createElement("select");

  selectVoto.add(new Option("Non valutato", ""));

  for (let mezzoPunto = 2; mezzoPunto <= 10; mezzoPunto++) {
    const valore = mezzoPunto / 2;

    selectVoto.add(
      new Option(
        `${formattaVoto(valore)} / 5`,
        String(valore)
      )
    );
  }

  selectVoto.value =
    gioco.voto !== null &&
      gioco.voto !== undefined &&
      votoValido(gioco.voto)
      ? String(gioco.voto)
      : "";

  labelVoto.appendChild(selectVoto);

  const anteprimaVoto = document.createElement("div");
  anteprimaVoto.className = "anteprima-voto";
  anteprimaVoto.setAttribute("role", "status");

  function aggiornaAnteprimaVoto() {
    const voto = selectVoto.value === ""
      ? null
      : Number(selectVoto.value);

    anteprimaVoto.replaceChildren(
      creaVisualizzazioneVoto(voto)
    );
  }

  selectVoto.addEventListener(
    "change",
    aggiornaAnteprimaVoto
  );

  aggiornaAnteprimaVoto();

    const campiDate = document.createElement("div");
  campiDate.className = "campi-date-gioco";

  const labelInizio = document.createElement("label");
  labelInizio.textContent = "Data di inizio";

  const inputInizio = document.createElement("input");
  inputInizio.type = "date";
  inputInizio.min = "0001-01-01";
  inputInizio.max = "9999-12-31";
  inputInizio.value = gioco.dataInizio ?? "";

  labelInizio.appendChild(inputInizio);

  const labelFine = document.createElement("label");
  labelFine.textContent = "Data di fine";

  const inputFine = document.createElement("input");
  inputFine.type = "date";
  inputFine.min = "0001-01-01";
  inputFine.max = "9999-12-31";
  inputFine.value = gioco.dataFine ?? "";

  labelFine.appendChild(inputFine);

  function aggiornaLimitiDate() {
    inputFine.min = inputInizio.value || "0001-01-01";
    inputInizio.max = inputFine.value || "9999-12-31";
  }

  inputInizio.addEventListener("input", aggiornaLimitiDate);
  inputFine.addEventListener("input", aggiornaLimitiDate);

  aggiornaLimitiDate();

  campiDate.append(labelInizio, labelFine);

  const aiutoDate = document.createElement("p");
  aiutoDate.className = "aiuto-date";
  aiutoDate.textContent =
    "Date facoltative: puoi lasciare vuota quella che non ricordi.";



  const messaggio = document.createElement("p");
  messaggio.className = "messaggio-aggiunta";
  messaggio.setAttribute("role", "status");

  const pulsanteSalva = document.createElement("button");
  pulsanteSalva.type = "submit";
  pulsanteSalva.textContent = "Salva modifiche";

  const pulsanteAnnulla = document.createElement("button");
  pulsanteAnnulla.type = "button";
  pulsanteAnnulla.className = "pulsante-secondario";
  pulsanteAnnulla.textContent = "Annulla";

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    try {
      aggiornaGioco(gioco.id, {
        stato: selectStato.value,
        platino: supportaPlatino && checkboxPlatino.checked,
        voto: selectVoto.value === ""
          ? null
          : Number(selectVoto.value),
        dataInizio: inputInizio.value || null,
        dataFine: inputFine.value || null,
      });



      chiudiModifica();
      mostraLibreria();
    } catch (errore) {
      console.error("Errore nell'aggiornamento:", errore);
      messaggio.textContent =
        errore.message || "Impossibile salvare le modifiche.";

    }
  });

  const pulsanteElimina = document.createElement("button");
  pulsanteElimina.type = "button";
  pulsanteElimina.className = "pulsante-elimina";
  pulsanteElimina.textContent = "Elimina dalla libreria";

  pulsanteElimina.addEventListener("click", () => {
    const confermato = window.confirm(
      `Vuoi eliminare "${gioco.nome}" dalla libreria su ${gioco.piattaforma}?`
    );

    if (!confermato) {
      return;
    }

    try {
      eliminaDallaLibreria(gioco.id);
      chiudiModifica();
      mostraLibreria();
    } catch (errore) {
      console.error("Errore nell'eliminazione:", errore);
      messaggio.textContent = "Impossibile eliminare il gioco.";
    }
  });

  function chiudiModifica() {
    overlay.remove();
  }

  pulsanteAnnulla.addEventListener("click", chiudiModifica);

  overlay.addEventListener("click", (evento) => {
    if (evento.target === overlay) {
      chiudiModifica();
    }
  });

  document.addEventListener("keydown", function gestisciEscape(evento) {
    if (evento.key === "Escape") {
      chiudiModifica();
      document.removeEventListener("keydown", gestisciEscape);
    }
  });

  form.append(
    labelStato,
    labelPlatino,
    labelVoto,
    anteprimaVoto,
    pulsanteSalva,
    pulsanteAnnulla,
    messaggio
  );

  finestra.append(titolo, piattaforma, form, pulsanteElimina);
  overlay.appendChild(finestra);
  document.body.appendChild(overlay);
}

mostraLibreria();
