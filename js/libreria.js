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

  const stato = document.createElement("p");
  stato.textContent = `Stato: ${gioco.stato}`;

  scheda.append(titolo, piattaforma, stato);

  if (gioco.platino) {
    const platino = document.createElement("p");
    platino.textContent = "🏆 Platino ottenuto";
    scheda.appendChild(platino);
  }

  return scheda;
}

mostraLibreria();
