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
