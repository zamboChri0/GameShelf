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
    const immagine = document.createElement("img");
    immagine.src = gioco.immagine;
    immagine.alt = `Immagine di ${gioco.nome}`;
    immagine.loading = "lazy";

    immagine.addEventListener("error", () => {
      immagine.remove();
    });

    scheda.appendChild(immagine);
  }

  const titolo = document.createElement("h3");
  titolo.textContent = gioco.nome;

  const piattaforma = document.createElement("p");
  piattaforma.textContent = `Piattaforma: ${gioco.piattaforma}`;

  scheda.append(titolo, piattaforma);

  const form = document.createElement("form");
  form.className = "form-aggiunta";

  // Stato del gioco
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

  // Platino: disponibile per le piattaforme PlayStation
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

  // Salvataggio
  const pulsanteSalva = document.createElement("button");
  pulsanteSalva.type = "submit";
  pulsanteSalva.textContent = "Salva modifiche";

  const messaggio = document.createElement("p");
  messaggio.className = "messaggio-aggiunta";
  messaggio.setAttribute("role", "status");

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    try {
      aggiornaGioco(gioco.id, {
        stato: selectStato.value,
        platino: supportaPlatino && checkboxPlatino.checked,
      });

      messaggio.textContent = "Modifiche salvate!";
    } catch (errore) {
      console.error("Errore nell'aggiornamento:", errore);
      messaggio.textContent = "Impossibile salvare le modifiche.";
    }
  });

  // Eliminazione con conferma
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
      mostraLibreria();
    } catch (errore) {
      console.error("Errore nell'eliminazione:", errore);
      messaggio.textContent = "Impossibile eliminare il gioco.";
    }
  });

  form.append(
    labelStato,
    labelPlatino,
    pulsanteSalva,
    pulsanteElimina,
    messaggio
  );

  scheda.appendChild(form);

  return scheda;
}

mostraLibreria();
