function aggiornaStatoRun(giocoId, runId, stato) {
  if (!STATI_RUN.includes(stato)) {
    throw new Error("Stato non valido.");
  }

  const giochi = leggiLibreria();
  const gioco = giochi.find((elemento) => elemento.id === giocoId);
  const run = gioco?.runs.find((elemento) => elemento.id === runId);

  if (!gioco || !run) {
    throw new Error("Gioco o run non trovati.");
  }

  run.stato = stato;

  if (gioco.runCorrenteId === run.id) {
    gioco.stato = run.stato;
    gioco.note = run.note;
  }

  salvaLibreria(giochi);
}

function creaNuovaRun(giocoId, statoPrecedente) {
  const giochi = leggiLibreria();
  const gioco = giochi.find((elemento) => elemento.id === giocoId);

  if (!gioco) throw new Error("Gioco non trovato.");

  const precedente = gioco.runs.find(
    (run) => run.id === gioco.runCorrenteId
  );

  const daGestire = ["Da iniziare", "In corso", "In pausa"]
    .includes(precedente.stato);

  if (daGestire) {
    if (!["In pausa", "Finito", "Abbandonato"].includes(statoPrecedente)) {
      throw new Error("Scegli come lasciare la run precedente.");
    }
    precedente.stato = statoPrecedente;
  }

  const nuova = {
    id: crypto.randomUUID(),
    numero: Math.max(...gioco.runs.map((run) => run.numero)) + 1,
    stato: "Da iniziare",
    note: "",
  };

  gioco.runs.push(nuova);
  gioco.runCorrenteId = nuova.id;
  gioco.stato = nuova.stato;
  gioco.note = nuova.note;

  salvaLibreria(giochi);
  return nuova;
}

function apriDettagliRun(giocoId) {
  const apertura = document.activeElement;
  const finestra = document.createElement("dialog");
  finestra.className = "dialog-run";
  const titoloId = `titolo-run-${crypto.randomUUID()}`;
  finestra.setAttribute("aria-labelledby", titoloId);

  const testata = document.createElement("div");
  testata.className = "testata-run";

  const titolo = document.createElement("h2");
  titolo.id = titoloId;

  const chiudi = document.createElement("button");
  chiudi.type = "button";
  chiudi.textContent = "Chiudi";
  chiudi.className = "bottone-run secondario-run";
  chiudi.autofocus = true;
  chiudi.addEventListener("click", () => finestra.close());
  testata.append(titolo, chiudi);

  const contenuto = document.createElement("div");
  const messaggio = document.createElement("p");
  messaggio.className = "messaggio-run";
  messaggio.setAttribute("role", "status");

  finestra.append(testata, contenuto, messaggio);

  function aggiornaVista(testo, numeroFocus = null) {
    mostraLibreria();
    disegna();
    messaggio.textContent = testo;

    const destinazione = numeroFocus === null
      ? chiudi
      : [...contenuto.querySelectorAll("select[data-run-numero]")]
        .find((select) => Number(select.dataset.runNumero) === numeroFocus);

    (destinazione || chiudi).focus({ preventScroll: true });
  }

  function disegna() {
    const gioco = leggiLibreria().find((elemento) => elemento.id === giocoId);
    if (!gioco) throw new Error("Gioco non trovato.");

    titolo.textContent = gioco.nome;
    contenuto.replaceChildren();

    const piattaforma = document.createElement("p");
    piattaforma.className = "sottotitolo-run";
    piattaforma.textContent = `${gioco.piattaforma} · ${gioco.runs.length} run`;

    const avviso = document.createElement("p");
    avviso.className = "avviso-run";
    avviso.textContent = "La run corrente determina lo stato mostrato nella libreria. I cambiamenti nei moduli vengono salvati solo con il relativo pulsante.";
    contenuto.append(piattaforma, avviso);

    const storico = document.createElement("div");
    storico.className = "elenco-run";

    [...gioco.runs].sort((a, b) => b.numero - a.numero).forEach((run) => {
      const scheda = document.createElement("section");
      scheda.className = "scheda-run";
      const corrente = run.id === gioco.runCorrenteId;

      const nome = document.createElement("h3");
      nome.textContent = `Run ${run.numero}${corrente ? " · Corrente" : ""}`;

      const form = document.createElement("form");
      form.className = "form-run";

      const label = document.createElement("label");
      label.textContent = "Stato";
      const select = document.createElement("select");
      select.dataset.runNumero = String(run.numero);
      STATI_RUN.forEach((stato) => select.add(new Option(stato, stato)));
      select.value = run.stato;
      label.appendChild(select);

      const salva = document.createElement("button");
      salva.type = "submit";
      salva.className = "bottone-run";
      salva.textContent = "Salva stato";

      form.addEventListener("submit", (evento) => {
        evento.preventDefault();
        try {
          aggiornaStatoRun(giocoId, run.id, select.value);
          aggiornaVista(`Stato della run ${run.numero} salvato.`, run.numero);
        } catch (errore) {
          messaggio.textContent = errore.message;
        }
      });

      form.append(label, salva);
      scheda.append(nome, form);
      storico.appendChild(scheda);
    });

    contenuto.appendChild(storico);

    const corrente = gioco.runs.find((run) => run.id === gioco.runCorrenteId);
    const daGestire = ["Da iniziare", "In corso", "In pausa"].includes(corrente.stato);
    const nuovoForm = document.createElement("form");
    nuovoForm.className = "nuova-run";

    const nuovoTitolo = document.createElement("h3");
    nuovoTitolo.textContent = "Inizia una nuova run";
    nuovoForm.appendChild(nuovoTitolo);

    let selectPrecedente = null;

    if (daGestire) {
      const label = document.createElement("label");
      label.textContent = `Come lasci la run ${corrente.numero}?`;
      selectPrecedente = document.createElement("select");
      selectPrecedente.required = true;
      selectPrecedente.add(new Option("Scegli uno stato...", ""));
      ["In pausa", "Finito", "Abbandonato"].forEach((stato) => {
        selectPrecedente.add(new Option(stato, stato));
      });
      label.appendChild(selectPrecedente);
      nuovoForm.appendChild(label);
    }

    const crea = document.createElement("button");
    crea.type = "submit";
    crea.className = "bottone-run";
    crea.textContent = "+ Nuova run";
    nuovoForm.appendChild(crea);

    nuovoForm.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const statoPrecedente = selectPrecedente?.value ?? null;
      const dettaglio = daGestire
        ? `La run ${corrente.numero} verrà impostata su “${statoPrecedente}”.\n\n`
        : "";

      if (!window.confirm(
        dettaglio + "Creare una nuova run da iniziare? La precedente rimarrà nello storico. Le modifiche non salvate negli altri moduli non verranno applicate."
      )) return;

      try {
        const nuova = creaNuovaRun(giocoId, statoPrecedente);
        aggiornaVista(`Run ${nuova.numero} creata.`, nuova.numero);
      } catch (errore) {
        messaggio.textContent = errore.message;
      }
    });

    contenuto.appendChild(nuovoForm);
  }

  finestra.addEventListener("close", () => {
    finestra.remove();
    const pulsante = [...document.querySelectorAll(".pulsante-dettagli-run")]
      .find((elemento) => elemento.dataset.giocoId === giocoId);
    if (pulsante) pulsante.focus({ preventScroll: true });
    else if (apertura?.isConnected) apertura.focus();
    else document.getElementById("ricerca-libreria")?.focus({ preventScroll: true });
  }, { once: true });

  try {
    disegna();
    document.body.appendChild(finestra);
    finestra.showModal();
  } catch (errore) {
    finestra.remove();
    window.alert(`Impossibile aprire le run: ${errore.message}`);
  }
}
