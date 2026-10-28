const STATI_RUN = [
  "Da iniziare",
  "In corso",
  "In pausa",
  "Finito",
  "Abbandonato",
];

function normalizzaGiocoRun(gioco) {
  if (!gioco || typeof gioco !== "object" || Array.isArray(gioco)) {
    throw new Error("Gioco non valido.");
  }

  const haCampo = (campo) =>
    Object.prototype.hasOwnProperty.call(gioco, campo);

  const campiRun = ["versioneRun", "runs", "runCorrenteId"];
  const contieneDatiRun = campiRun.some(haCampo);

  if (!contieneDatiRun) {
    if (
      !STATI_RUN.includes(gioco.stato) ||
      typeof gioco.note !== "string"
    ) {
      throw new Error("Impossibile convertire stato o note del gioco.");
    }

    const primaRun = {
      id: crypto.randomUUID(),
      numero: 1,
      stato: gioco.stato,
      note: gioco.note,
    };

    return {
      ...gioco,
      versioneRun: 1,
      runs: [primaRun],
      runCorrenteId: primaRun.id,
    };
  }

  if (
    gioco.versioneRun !== 1 ||
    !Array.isArray(gioco.runs) ||
    gioco.runs.length === 0 ||
    typeof gioco.runCorrenteId !== "string"
  ) {
    throw new Error("Struttura delle run non valida.");
  }

  const ids = new Set();
  const numeri = new Set();

  gioco.runs.forEach((run) => {
    if (
      !run ||
      typeof run !== "object" ||
      Array.isArray(run) ||
      typeof run.id !== "string" ||
      run.id.trim() === "" ||
      !Number.isInteger(run.numero) ||
      run.numero < 1 ||
      !STATI_RUN.includes(run.stato) ||
      typeof run.note !== "string" ||
      ids.has(run.id) ||
      numeri.has(run.numero)
    ) {
      throw new Error("Una run contiene dati non validi o duplicati.");
    }

    ids.add(run.id);
    numeri.add(run.numero);
  });

  const corrente = gioco.runs.find(
    (run) => run.id === gioco.runCorrenteId
  );

  if (!corrente) {
    throw new Error("La run corrente non esiste.");
  }

  if (
    gioco.stato !== corrente.stato ||
    gioco.note !== corrente.note
  ) {
    throw new Error("Stato o note non corrispondono alla run corrente.");
  }

  return {
    ...gioco,
    runs: gioco.runs.map((run) => ({ ...run })),
  };
}

function normalizzaLibreriaRun(giochi) {
  if (!Array.isArray(giochi)) {
    throw new Error("I dati della libreria non sono validi.");
  }

  return giochi.map(normalizzaGiocoRun);
}
