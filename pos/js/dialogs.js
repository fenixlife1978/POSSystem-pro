/* ============================================================
   UI DIALOGOS PROPIOS — reemplazo de los diálogos nativos de
   Electron (alert/confirm/prompt). Los nativos roban el foco de
   la ventana y bloquean los inputs; estos modales viven en el DOM
   y no alteran el foco del renderer.
   API (asíncrona, devuelve Promises):
     uiAlert(msg)                  -> Promise<void>
     uiConfirm(msg)                -> Promise<boolean>
     uiPrompt(msg, valorInicial?)  -> Promise<string|null>
   ============================================================ */
(function () {
  let current = null;   // { resolve, withInput }

  function build() {
    const ov = document.createElement("div");
    ov.id = "ui-dialog-overlay";
    ov.style.cssText =
      "position:fixed;inset:0;display:none;align-items:center;justify-content:center;" +
      "background:rgba(10,15,30,.45);z-index:2147483000;font-family:'Inter','Segoe UI',Arial,sans-serif;";
    const box = document.createElement("div");
    box.id = "ui-dialog-box";
    box.style.cssText =
      "background:#fff;border:1px solid #c7ced9;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.4);" +
      "width:min(460px,92vw);max-width:460px;overflow:hidden;";
    box.innerHTML =
      '<div style="padding:18px 20px 6px;font-weight:700;font-size:16px;color:#0f172a"></div>' +
      '<div style="padding:6px 20px 18px;font-size:14px;line-height:1.5;color:#334155;white-space:pre-wrap;min-height:24px"></div>' +
      '<div style="padding:10px 20px;display:flex;justify-content:center"><input type="text" ' +
      'style="box-sizing:border-box;width:100%;padding:9px 10px;border:1px solid #94a3b8;border-radius:7px;font-size:14px"' +
      '></div>' +
      '<div style="padding:14px 20px 18px;display:flex;justify-content:flex-end;gap:10px">' +
      '<button data-act="cancel" style="padding:8px 18px;border:1px solid #c7ced9;background:#fff;border-radius:7px;font-size:14px;cursor:pointer;font-weight:600;color:#334155"></button>' +
      '<button data-act="ok" style="padding:8px 20px;border:0;background:#2f6bff;color:#fff;border-radius:7px;font-size:14px;cursor:pointer;font-weight:700"></button>' +
      '</div>';
    ov.appendChild(box);
    document.body.appendChild(ov);
    return ov;
  }

  let ov = null;
  function overlay() {
    if (!ov) ov = build();
    return ov;
  }
  const box = () => overlay().firstElementChild;
  const byAct = act => box().querySelector('[data-act="' + act + '"]');

  function onKey(e) {
    if (!current) return;
    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); confirmAction(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelAction(); }
  }
  function onMask(e) { if (e.target === overlay()) cancelAction(); }

  function open(opts) {
    return new Promise(resolve => {
      current = { resolve, withInput: opts.withInput };
      const b = box();
      b.style.display = "flex";
      const title = b.children[0];
      const msg = b.children[1];
      const inputWrap = b.children[2];
      const input = inputWrap.querySelector("input");
      const footer = b.children[3];
      const btnCancel = byAct("cancel");
      const btnOk = byAct("ok");
      title.textContent = opts.title || "";
      msg.textContent = opts.message || "";

      // Tres modos: alert (solo OK), confirm (Sí/No), prompt (input + OK/Cancelar).
      if (opts.withInput) {
        inputWrap.style.display = "";
        input.value = opts.value != null ? String(opts.value) : "";
        btnOk.textContent = opts.okLabel || "Aceptar";
        btnCancel.textContent = opts.cancelLabel || "Cancelar";
        btnCancel.style.display = "";
        btnOk.style.display = "";
        btnOk.onclick = () => done(input.value);
        btnCancel.onclick = () => done(null);
        setTimeout(() => input.focus(), 30);
      } else if (opts.buttons === false) {
        inputWrap.style.display = "none";
        btnOk.textContent = opts.okLabel || "Aceptar";
        btnCancel.style.display = "none";
        btnOk.style.display = "";
        btnOk.onclick = () => done(true);
        setTimeout(() => btnOk.focus(), 30);
      } else {
        inputWrap.style.display = "none";
        btnOk.textContent = opts.yesLabel || "Sí";
        btnCancel.textContent = opts.noLabel || "No";
        btnCancel.style.display = "";
        btnOk.style.display = "";
        btnOk.onclick = () => done(true);
        btnCancel.onclick = () => done(false);
        setTimeout(() => btnCancel.focus(), 30);
      }
      document.addEventListener("keydown", onKey, true);
      overlay().addEventListener("mousedown", onMask);
    }).catch(() => {});
  }

  function done(v) {
    if (!current) return;
    const r = current.resolve;
    current = null;
    cleanup();
    r(v);
  }
  function confirmAction() { if (current) byAct("ok").click(); }
  function cancelAction() { if (current) byAct("cancel").click(); }
  function cleanup() {
    overlay().style.display = "none";
    document.removeEventListener("keydown", onKey, true);
    overlay().removeEventListener("mousedown", onMask);
  }

  window.uiAlert = function (message) {
    return open({ title: "Mensaje", message, withInput: false, buttons: false, okLabel: "Aceptar" });
  };
  window.uiConfirm = function (message) {
    return open({ title: "Confirmar", message, withInput: false, yesLabel: "Sí", noLabel: "No" });
  };
  window.uiPrompt = function (message, value) {
    return open({ title: "Información", message, withInput: true, value, okLabel: "Aceptar", cancelLabel: "Cancelar" });
  };

  // Sobrescribe alert() nativo para que no robe el foco.
  if (window.electron || window.desktop) {
    window.alert = function (m) { uiAlert(typeof m === "string" ? m : String(m)); };
  }
})();