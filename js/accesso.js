const formAccesso = document.getElementById("form-accesso");
const campoEmail = document.getElementById("email");
const campoPassword = document.getElementById("password");
const pulsanteAccedi = document.getElementById("pulsante-accedi");
const pulsanteRegistra = document.getElementById("pulsante-registra");
const messaggioAccesso = document.getElementById("messaggio-accesso");

formAccesso.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  // Pressing Enter submits with the first button (Accedi),
  // so the mode comes from the button that actually submitted the form.
  const registrazione = evento.submitter?.id === "pulsante-registra";

  const email = campoEmail.value.trim();
  const password = campoPassword.value;

  pulsanteAccedi.disabled = true;
  pulsanteRegistra.disabled = true;
  messaggioAccesso.textContent = registrazione
    ? "Creazione dell'account in corso…"
    : "Accesso in corso…";

  try {
    if (registrazione) {
      await registraAccount(email, password);
    } else {
      await accedi(email, password);
    }

    window.location.href = "libreria.html";
  } catch (errore) {
    console.error("Errore di accesso:", errore);
    messaggioAccesso.textContent = errore.message;
  } finally {
    pulsanteAccedi.disabled = false;
    pulsanteRegistra.disabled = false;
  }
});
