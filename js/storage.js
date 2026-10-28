const CHIAVE_LIBRERIA = "gameshelf:libreria:v1";

function leggiLibreria() {
  const contenuto = localStorage.getItem(CHIAVE_LIBRERIA);

  if (!contenuto) {
    return [];
  }

  const originali = JSON.parse(contenuto);
  const giochi = normalizzaLibreriaRun(originali);

  if (JSON.stringify(originali) !== JSON.stringify(giochi)) {
    localStorage.setItem(
      CHIAVE_LIBRERIA,
      JSON.stringify(giochi)
    );
  }

  return giochi;
}

function salvaLibreria(giochi) {
  const normalizzati = normalizzaLibreriaRun(giochi);

  localStorage.setItem(
    CHIAVE_LIBRERIA,
    JSON.stringify(normalizzati)
  );
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

    const precedente = giochi[indice];

  const aggiornato = {
    ...precedente,
    ...modifiche,
    id: precedente.id,
    versioneRun: precedente.versioneRun,
    runCorrenteId: precedente.runCorrenteId,
    runs: precedente.runs.map((run) => ({ ...run })),
  };

  const corrente = aggiornato.runs.find(
    (run) => run.id === aggiornato.runCorrenteId
  );

  if (Object.prototype.hasOwnProperty.call(modifiche, "stato")) {
    corrente.stato = modifiche.stato;
  }

  if (Object.prototype.hasOwnProperty.call(modifiche, "note")) {
    corrente.note = modifiche.note;
  }

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
