const listaPlatini = document.getElementById("lista-platini");
const messaggioPlatini = document.getElementById("messaggio-platini");
const ordinePlatini = document.getElementById("ordine-platini");

ordinePlatini.addEventListener("change", mostraPlatini);

function confrontaTitoliPlatini(a, b) {
  return String(a.nome ?? "").localeCompare(
    String(b.nome ?? ""),
    "it",
    { sensitivity: "base", numeric: true }
  );
}

function mostraPlatini() {
  listaPlatini.replaceChildren();

  try {
    const platini = leggiLibreria().filter((gioco) =>
      /playstation/i.test(gioco.piattaforma) &&
      gioco.platino === true
    );

    if (ordinePlatini.value === "piattaforma") {
      platini.sort((a, b) => {
        const confrontoPiattaforma =
          String(a.piattaforma ?? "").localeCompare(
            String(b.piattaforma ?? ""),
            "it",
            { numeric: true }
          );

        return confrontoPiattaforma || confrontaTitoliPlatini(a, b);
      });
    } else {
      platini.sort(confrontaTitoliPlatini);
    }

    messaggioPlatini.textContent =
      platini.length === 1
        ? "Platini ottenuti: 1."
        : `Platini ottenuti: ${platini.length}.`;

    if (platini.length === 0) {
      const vuoto = document.createElement("p");
      vuoto.className = "libreria-nessun-risultato";
      vuoto.textContent =
        "Non hai ancora segnato nessun Platino. " +
        "Puoi farlo dalla finestra Modifica di un gioco PlayStation.";

      listaPlatini.appendChild(vuoto);
      return;
    }

    const frammento = document.createDocumentFragment();

    platini.forEach((gioco) => {
      frammento.appendChild(creaSchedaPlatino(gioco));
    });

    listaPlatini.appendChild(frammento);
  } catch (errore) {
    console.error("Errore nel caricamento dei platini:", errore);

    messaggioPlatini.textContent =
      "Impossibile leggere i platini dalla libreria salvata.";
  }
}

function creaSchedaPlatino(gioco) {
  const scheda = document.createElement("article");
  scheda.className = "scheda scheda-gioco scheda-platino";

  if (gioco.immagine) {
    const contenitoreImmagine = document.createElement("div");
    contenitoreImmagine.className = "immagine-platino";

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

  const contenuto = document.createElement("div");
  contenuto.className = "contenuto-platino";

  const badge = document.createElement("span");
  badge.className = "badge badge-platino";
  badge.textContent = "Platino ottenuto";

  const titolo = document.createElement("h2");
  titolo.textContent = gioco.nome;

  const piattaforma = document.createElement("p");
  piattaforma.className = "piattaforma-platino";
  piattaforma.textContent = gioco.piattaforma;

  contenuto.append(badge, titolo, piattaforma);

  if (gioco.voto !== null &&
      gioco.voto !== undefined &&
      votoValido(gioco.voto)) {
    const voto = document.createElement("p");
    voto.className = "voto-platino";
    voto.textContent = `Voto personale: ${formattaVoto(gioco.voto)}/5`;

    contenuto.appendChild(voto);
  }

  scheda.appendChild(contenuto);

  return scheda;
}

mostraPlatini();