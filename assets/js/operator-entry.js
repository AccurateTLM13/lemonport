/**
 * operator-entry.js
 * Lemonteed — Operator Log Entry Mechanic
 *
 * A small isolated easter egg. Listens for the typed sequence "9to5"
 * anywhere on the page and shows a small access-granted message
 * linking to /operator-log/.
 *
 * Loaded only in index.html (main public site).
 * Deliberately NOT in gallery.js — this is an entry mechanic, not gallery logic.
 */

(function () {
  "use strict";

  const SEQUENCE = "9to5";
  const DISPLAY_MS = 4000;

  let buffer = "";
  let toastTimeout = null;

  function showEntryToast() {
    const existing = document.getElementById("op-entry-toast");
    if (existing) {
      clearTimeout(toastTimeout);
      existing.remove();
    }

    const toast = document.createElement("a");
    toast.id = "op-entry-toast";
    toast.href = "/operator-log/";
    toast.setAttribute("aria-label", "Access granted — navigate to Operator Log");
    toast.style.cssText = [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "z-index:9999",
      "display:flex",
      "align-items:center",
      "gap:10px",
      "padding:10px 18px",
      "border:1px solid #a08c00",
      "background:#0e0f0c",
      "color:#d4b800",
      "font-family:'Space Mono','Courier New',Courier,monospace",
      "font-size:11px",
      "font-weight:700",
      "letter-spacing:0.1em",
      "text-transform:uppercase",
      "text-decoration:none",
      "box-shadow:0 4px 24px rgba(0,0,0,0.5)",
      "animation:op-entry-in 0.3s ease both",
      "cursor:pointer"
    ].join(";");
    toast.textContent = "ACCESS GRANTED → /operator-log/";

    // Inline keyframe (avoids stylesheet dependency)
    if (!document.getElementById("op-entry-style")) {
      const style = document.createElement("style");
      style.id = "op-entry-style";
      style.textContent = "@keyframes op-entry-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}";
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.4s ease";
      setTimeout(() => toast.remove(), 400);
    }, DISPLAY_MS);
  }

  function onKeypress(event) {
    // Ignore if user is typing in an input or textarea
    const tag = (event.target || {}).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      buffer = "";
      return;
    }

    // Only printable characters
    if (event.key && event.key.length === 1) {
      buffer = (buffer + event.key).slice(-SEQUENCE.length);

      if (buffer === SEQUENCE) {
        buffer = "";
        showEntryToast();
      }
    }
  }

  document.addEventListener("keypress", onKeypress);
})();
