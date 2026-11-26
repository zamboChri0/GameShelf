const pulsanteEsporta = document.getElementById("esporta-backup");
const pulsanteImporta = document.getElementById("importa-backup");
const inputBackup = document.getElementById("file-backup");
const messaggioBackup = document.getElementById("messaggio-backup");

function validaGiochiBackup(giochi) {
    if (!Array.isArray(giochi)) {
        throw new Error("Il backup non contiene una lista di giochi valida.");
    }

    const ids = new Set();
    const combinazioni = new Set();

    const stati = [
        "Da iniziare",
        "In corso",
        "In pausa",
        "Finito",
        "Abbandonato",
    ];


    const testoNonVuoto = (valore) =>
        typeof valore === "string" && valore.trim().length > 0;

    const dataValida = (valore) =>
        typeof valore === "string" &&
        valore.trim() !== "" &&
        Number.isFinite(Date.parse(valore));

    const immagineValida = (valore) => {
        if (valore === null) return true;
        if (typeof valore !== "string") return false;

        try {
            const url = new URL(valore);
            return url.protocol === "https:" || url.protocol === "http:";
        } catch {
            return false;
        }
    };

    giochi.forEach((gioco, indice) => {
        const valido =
            gioco !== null &&
            typeof gioco === "object" &&
            !Array.isArray(gioco) &&
            testoNonVuoto(gioco.id) &&
            Number.isInteger(gioco.rawgId) &&
            gioco.rawgId > 0 &&
            testoNonVuoto(gioco.nome) &&
            immagineValida(gioco.immagine) &&
            Array.isArray(gioco.generi) &&
            testoNonVuoto(gioco.piattaforma) &&
            stati.includes(gioco.stato) &&
            typeof gioco.platino === "boolean" &&
            (
                !Object.prototype.hasOwnProperty.call(gioco, "preferito") ||
                typeof gioco.preferito === "boolean"
            ) &&

            votoValido(gioco.voto) &&

            typeof gioco.note === "string" &&
            dateGiocoValide(
                gioco.dataInizio === undefined
                    ? null
                    : gioco.dataInizio,
                gioco.dataFine === undefined
                    ? null
                    : gioco.dataFine
            ) &&
            dataValida(gioco.aggiuntoIl);


        if (!valido) {
            throw new Error(
                `Il gioco in posizione ${indice + 1} contiene dati non validi.`
            );
        }

        const combinazione = JSON.stringify([
            gioco.rawgId,
            gioco.piattaforma.trim().toLocaleLowerCase("it"),
        ]);

        if (ids.has(gioco.id) || combinazioni.has(combinazione)) {
            throw new Error("Il backup contiene giochi duplicati.");
        }

        ids.add(gioco.id);
        combinazioni.add(combinazione);
    });

    return giochi;
}

function validaTempoBackup(giochi) {
  giochi.forEach((gioco, indice) => {
    const ore = gioco.oreGiocate;
    const minuti = gioco.minutiGiocati;

    const oreValide =
      ore === undefined ||
      (Number.isSafeInteger(ore) && ore >= 0);

    const minutiValidi =
      minuti === undefined ||
      (
        Number.isInteger(minuti) &&
        minuti >= 0 &&
        minuti <= 59
      );

    if (!oreValide || !minutiValidi) {
      throw new Error(
        `Il gioco in posizione ${indice + 1} ` +
        "contiene un tempo giocato non valido."
      );
    }
  });

  return giochi;
}

function validaWishlistBackup(giochi) {
  if (!Array.isArray(giochi)) {
    throw new Error("La wishlist nel backup non è valida.");
  }

  // Riutilizza i controlli comuni della libreria:
  // identificativi, duplicati, titolo, piattaforma e immagine.
  const datiDaControllare = giochi.map((gioco) => {
    if (
      gioco === null ||
      typeof gioco !== "object" ||
      Array.isArray(gioco)
    ) {
      throw new Error(
        "La wishlist contiene un elemento non valido."
      );
    }

    return {
      id: gioco.id,
      rawgId: gioco.rawgId,
      nome: gioco.nome,
      immagine: gioco.immagine,
      generi: gioco.generi,
      piattaforma: gioco.piattaforma,
      aggiuntoIl: gioco.aggiuntoIl,
      stato: "Da iniziare",
      platino: false,
      preferito: false,
      voto: null,
      note: "",
      dataInizio: null,
      dataFine: null,
    };
  });

  validaGiochiBackup(datiDaControllare);

  return giochi;
}

function leggiFileBackup(testo) {
  let backup;

  try {
    backup = JSON.parse(testo.replace(/^﻿/, ""));
  } catch {
    throw new Error("Il file non contiene un JSON valido.");
  }

  if (
    backup === null ||
    typeof backup !== "object" ||
    Array.isArray(backup) ||
    backup.app !== "GameShelf" ||
    ![1, 2].includes(backup.versione)
  ) {
    throw new Error(
      "Il file non è un backup GameShelf supportato."
    );
  }

  const giochi = validaTempoBackup(
    validaGiochiBackup(backup.giochi)
  );

  const wishlist = backup.versione === 2
    ? validaWishlistBackup(backup.wishlist)
    : null;

  return {
    giochi,
    wishlist,
    versione: backup.versione,
  };
}

// Sends the backup to the account. The server replaces the data in one transaction.
async function applicaBackup(backup) {
  await chiamaApi("/collezione/importa", {
    metodo: "POST",
    corpo: {
      giochi: backup.giochi,
      wishlist: backup.versione === 2 ? backup.wishlist : null,
    },
    autenticato: true,
  });
}

pulsanteEsporta.addEventListener("click", async () => {
  messaggioBackup.textContent = "";

  try {
    const dati = await caricaCollezione();

    const giochi = validaTempoBackup(
      validaGiochiBackup(dati.libreria)
    );

    const wishlist = validaWishlistBackup(dati.wishlist);
    const adesso = new Date();

    const backup = {
      app: "GameShelf",
      versione: 2,
      esportatoIl: adesso.toISOString(),
      giochi,
      wishlist,
    };

    const contenuto = JSON.stringify(backup, null, 2);

    const blob = new Blob([contenuto], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const timestamp = adesso
      .toISOString()
      .replace(/[:.]/g, "-");

    link.href = url;
    link.download = `gameshelf-backup-${timestamp}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 10000);

    messaggioBackup.textContent =
      `Download avviato: ${giochi.length} giochi in libreria ` +
      `e ${wishlist.length} nella wishlist. ` +
      "Conserva il file in un posto sicuro.";
  } catch (errore) {
    console.error("Errore esportazione:", errore);

    if (errore.stato === 401) {
      window.location.href = "accesso.html";
      return;
    }

    messaggioBackup.textContent =
      `Backup non esportato: ${errore.message}`;
  }
});

pulsanteImporta.addEventListener("click", () => {
  inputBackup.value = "";
  inputBackup.click();
});

inputBackup.addEventListener("change", async () => {
  const file = inputBackup.files[0];

  if (!file) {
    return;
  }

  pulsanteImporta.disabled = true;
  pulsanteEsporta.disabled = true;
  messaggioBackup.textContent = "Controllo del backup...";

  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        "Il file supera il limite previsto di 5 MB."
      );
    }

    const testo = await file.text();
    const backup = leggiFileBackup(testo);

    const riepilogo = backup.versione === 2
      ? (
          `Il backup contiene ${backup.giochi.length} giochi ` +
          `in libreria e ${backup.wishlist.length} nella wishlist.\n\n` +
          "Libreria e wishlist del tuo account verranno " +
          "sostituite, non unite al backup."
        )
      : (
          `Il backup contiene ${backup.giochi.length} giochi.\n\n` +
          "È un backup precedente: verrà sostituita soltanto " +
          "la libreria. La wishlist attuale resterà invariata."
        );

    const confermato = window.confirm(
      riepilogo +
      "\n\nHai esportato un backup completo dei dati attuali?" +
      "\n\nVuoi continuare?"
    );

    if (!confermato) {
      messaggioBackup.textContent =
        "Importazione annullata. Nessun dato modificato.";
      return;
    }

    await applicaBackup(backup);
    await caricaLibreria();

    messaggioBackup.textContent = backup.versione === 2
      ? (
          `Backup importato: ${backup.giochi.length} giochi ` +
          `in libreria e ${backup.wishlist.length} nella wishlist.`
        )
      : (
          `Backup importato: ${backup.giochi.length} giochi ` +
          "nella libreria. Wishlist lasciata invariata."
        );
  } catch (errore) {
    console.error("Errore importazione:", errore);

    if (errore.stato === 401) {
      window.location.href = "accesso.html";
      return;
    }

    messaggioBackup.textContent =
      `Importazione non riuscita: ${errore.message}`;
  } finally {
    inputBackup.value = "";
    pulsanteImporta.disabled = false;
    pulsanteEsporta.disabled = false;
  }
});
