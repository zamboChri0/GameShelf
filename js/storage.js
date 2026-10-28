const CHIAVE_LIBRERIA = "gameshelf:libreria:v1";

function leggiLibreria() {
  const contenuto = localStorage.getItem(CHIAVE_LIBRERIA);

  if (!contenuto) {
    return [];
  }

  const giochi = JSON.parse(contenuto);

  if (!Array.isArray(giochi)) {
    throw new Error("I dati della libreria non sono validi.");
  }

  return giochi;
}

function salvaLibreria(giochi) {
  localStorage.setItem(CHIAVE_LIBRERIA, JSON.stringify(giochi));
}

function aggiungiAllaLibreria(gioco, piattaforma, stato) {
  const giochi = leggiLibreria();

  const giaPresente = giochi.some(
    (elemento) =>
      elemento.rawgId === gioco.id &&
      elemento.piattaforma === piattaforma
  );

  if (giaPresente) {
    return {
      aggiunto: false,
      messaggio: "Questo gioco è già nella libreria su questa piattaforma.",
    };
  }

  const nuovoGioco = {
    id: crypto.randomUUID(),
    rawgId: gioco.id,
    nome: gioco.name,
    immagine: gioco.image || null,
    generi: gioco.genres || [],
    piattaforma,
    stato,
    platino: false,
    preferito: false,
    voto: null,
    note: "",
    dataInizio: null,
    dataFine: null,
    aggiuntoIl: new Date().toISOString(),

  };

  giochi.push(nuovoGioco);
  salvaLibreria(giochi);

  return {
    aggiunto: true,
    messaggio: "Gioco aggiunto alla libreria!",
  };
}

function aggiornaGioco(id, modifiche) {
    if (
    Object.prototype.hasOwnProperty.call(modifiche, "preferito") &&
    typeof modifiche.preferito !== "boolean"
  ) {
    throw new Error("Il valore del preferito non è valido.");
  }

    if (
    Object.prototype.hasOwnProperty.call(modifiche, "voto") &&
    !votoValido(modifiche.voto)
  ) {
    throw new Error(
      "Il voto deve essere da 1 a 5, con incrementi di 0,5."
    );
  }

  const giochi = leggiLibreria();

  const indice = giochi.findIndex((gioco) => gioco.id === id);

  if (indice === -1) {
    throw new Error("Gioco non trovato nella libreria.");
  }

  const aggiornato = {
    ...giochi[indice],
    ...modifiche,
    id: giochi[indice].id,
  };

  const inizio = aggiornato.dataInizio === undefined
    ? null
    : aggiornato.dataInizio;

  const fine = aggiornato.dataFine === undefined
    ? null
    : aggiornato.dataFine;

  if (!dateGiocoValide(inizio, fine)) {
    throw new Error(
      "Controlla le date: devono essere valide e la fine " +
      "non può precedere l'inizio."
    );
  }

  aggiornato.dataInizio = inizio;
  aggiornato.dataFine = fine;

  giochi[indice] = aggiornato;

  salvaLibreria(giochi);

}

function eliminaDallaLibreria(id) {
  const giochi = leggiLibreria();

  const aggiornati = giochi.filter((gioco) => gioco.id !== id);

  salvaLibreria(aggiornati);
}

function votoValido(voto) {
  return (
    voto === null ||
    (
      typeof voto === "number" &&
      Number.isFinite(voto) &&
      voto >= 1 &&
      voto <= 5 &&
      Number.isInteger(voto * 2)
    )
  );
}

function formattaVoto(voto) {
  return voto.toLocaleString("it-IT", {
    maximumFractionDigits: 1,
  });
}


function dataGiocoValida(valore) {
  if (valore === null) {
    return true;
  }

  if (
    typeof valore !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valore) ||
    valore.startsWith("0000-")
  ) {
    return false;
  }

  const data = new Date(`${valore}T00:00:00.000Z`);

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valore
  );
}

function dateGiocoValide(inizio, fine) {
  return (
    dataGiocoValida(inizio) &&
    dataGiocoValida(fine) &&
    (
      inizio === null ||
      fine === null ||
      fine >= inizio
    )
  );
}
