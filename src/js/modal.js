/* =========================================================
   Requirement 11 — modal windows
   A single <dialog> is reused for every card. Each card
   carries its own detail markup in a <template>, which is
   cloned into the dialog on open — so there is one dialog in
   the DOM instead of six, and the detail content still lives
   next to the card it belongs to in the source.
   ========================================================= */

(function () {
  "use strict";

  var dialog = document.getElementById("case-modal");
  var mount = document.getElementById("case-modal-body");
  if (!dialog || !mount) return;

  var closeButton = dialog.querySelector(".modal__close");
  var lastTrigger = null;

  /* <dialog> is well supported, but if it is missing the cards must
     still do something useful rather than silently failing. */
  var supportsDialog = typeof dialog.showModal === "function";

  function open(trigger) {
    var card = trigger.closest(".card");
    var template = card && card.querySelector(".card__detail");
    if (!template) return;

    mount.replaceChildren(template.content.cloneNode(true));

    lastTrigger = trigger;
    dialog.classList.remove("is-closing");
    document.body.classList.add("has-modal");
    dialog.showModal();

    // Start the dialog scrolled to the top even if the previous one
    // was left scrolled down.
    var scroller = dialog.querySelector(".modal__scroll");
    if (scroller) scroller.scrollTop = 0;
  }

  function close() {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;

    // Let the closing animation finish before the element disappears.
    dialog.classList.add("is-closing");

    var done = function () {
      dialog.classList.remove("is-closing");
      dialog.close();
      document.body.classList.remove("has-modal");
      mount.replaceChildren();

      // Return focus to the card that opened the dialog, so keyboard
      // users are not dumped back at the top of the document.
      if (lastTrigger) {
        lastTrigger.focus();
        lastTrigger = null;
      }
    };

    dialog.addEventListener("animationend", done, { once: true });
    // Safety net: if the animation never fires (reduced motion, a
    // background tab), close anyway.
    window.setTimeout(function () {
      if (dialog.classList.contains("is-closing")) done();
    }, 400);
  }

  /* ---- Triggers ---- */
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;

    var trigger = target.closest(".card__trigger");
    if (trigger && supportsDialog) {
      event.preventDefault();
      open(trigger);
    }
  });

  if (closeButton) closeButton.addEventListener("click", close);

  /* ---- Click the backdrop to dismiss ----
     A click on the dialog element itself, rather than on its
     contents, means the backdrop was hit. */
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) close();
  });

  /* ---- Esc ----
     The browser fires `cancel` and would close instantly; take it
     over so the exit animation still runs. */
  dialog.addEventListener("cancel", function (event) {
    event.preventDefault();
    close();
  });
})();
