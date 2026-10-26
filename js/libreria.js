const listaLibreria = document.getElementById("lista-libreria");
const messaggioLibreria = document.getElementById("messaggio-libreria");

function mostraLibreria() {
  listaLibreria.replaceChildren();

  try {
    const giochi = leggiLibreria();

    if (giochi.length === 0) {
      messaggioLibreria.textContent =
        "La tua libreria è vuota. Cerca un gioco e aggiungilo!";
      return;
    }

    messaggioLibreria.textContent =
      `Giochi nella libreria: ${giochi.length}.`;

    [...giochi].reverse().forEach((gioco) => {
      listaLibreria.appendChild(creaSchedaLibreria(gioco));
    });
  } catch (errore) {
    console.error("Errore nel caricamento della libreria:", errore);

    messaggioLibreria.textContent =
      "Impossibile leggere la libreria salvata.";
  }
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
  pulsanteModifica.textContent = "✏️";

  pulsanteModifica.addEventListener("click", () => {
    apriModificaGioco(gioco);
  });

  intestazione.append(titolo, pulsanteModifica);

  const piattaforma = document.createElement("p");
  piattaforma.className = "piattaforma-gioco";
  piattaforma.textContent = gioco.piattaforma;

  const badgeStato = document.createElement("span");
  badgeStato.className = "badge badge-stato";

  const classiStato = {
    "Da iniziare": "stato-da-iniziare",
    "In corso": "stato-in-corso",
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

  scheda.append(intestazione, piattaforma, badges);

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

  ["Da iniziare", "In corso", "Finito", "Abbandonato"].forEach((stato) => {
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
      });

      chiudiModifica();
      mostraLibreria();
    } catch (errore) {
      console.error("Errore nell'aggiornamento:", errore);
      messaggio.textContent = "Impossibile salvare le modifiche.";
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

  form.append(labelStato, labelPlatino, pulsanteSalva, pulsanteAnnulla, messaggio);

  finestra.append(titolo, piattaforma, form, pulsanteElimina);
  overlay.appendChild(finestra);
  document.body.appendChild(overlay);
}

mostraLibreria();
