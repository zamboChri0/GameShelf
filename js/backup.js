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
            votoValido(gioco.voto) &&

            typeof gioco.note === "string" &&
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

function leggiFileBackup(testo) {
    let backup;

    try {
        backup = JSON.parse(testo.replace(/^\uFEFF/, ""));
    } catch {
        throw new Error("Il file non contiene un JSON valido.");
    }

    if (
        backup === null ||
        typeof backup !== "object" ||
        Array.isArray(backup) ||
        backup.app !== "GameShelf" ||
        backup.versione !== 1
    ) {
        throw new Error(
            "Il file non è un backup GameShelf supportato."
        );
    }

    return validaGiochiBackup(backup.giochi);
}

pulsanteEsporta.addEventListener("click", () => {
    messaggioBackup.textContent = "";

    try {
        const giochi = validaGiochiBackup(leggiLibreria());
        const adesso = new Date();

        const backup = {
            app: "GameShelf",
            versione: 1,
            esportatoIl: adesso.toISOString(),
            giochi,
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
            `Download avviato: ${giochi.length} giochi. ` +
            "Conserva il file in un posto sicuro.";
    } catch (errore) {
        console.error("Errore esportazione:", errore);
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

    if (!file) return;

    pulsanteImporta.disabled = true;
    pulsanteEsporta.disabled = true;
    messaggioBackup.textContent = "Controllo del backup...";

    let salvato = false;

    try {
        if (file.size > 5 * 1024 * 1024) {
            throw new Error("Il file supera il limite previsto di 5 MB.");
        }

        const testo = await file.text();
        const giochi = leggiFileBackup(testo);

        const confermato = window.confirm(
            `Il backup contiene ${giochi.length} giochi.\n\n` +
            "La libreria attuale su questo browser verrà sostituita, " +
            "non unita al backup.\n\n" +
            "Hai esportato una copia della libreria attuale?\n\n" +
            "Vuoi continuare?"
        );

        if (!confermato) {
            messaggioBackup.textContent =
                "Importazione annullata. Nessun dato modificato.";
            return;
        }

        salvaLibreria(giochi);
        salvato = true;

        mostraLibreria();

        messaggioBackup.textContent =
            `Backup importato: ${giochi.length} giochi ripristinati.`;
    } catch (errore) {
        console.error("Errore importazione:", errore);

        messaggioBackup.textContent = salvato
            ? "Dati salvati, ma la visualizzazione non si è aggiornata. " +
            "Ricarica la pagina."
            : `Importazione non riuscita: ${errore.message} ` +
            "La libreria non è stata sostituita.";
    } finally {
        inputBackup.value = "";
        pulsanteImporta.disabled = false;
        pulsanteEsporta.disabled = false;
    }
});
