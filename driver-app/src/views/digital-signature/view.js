import { getDriverRoutes, markStopDelivered } from "../../api/index.js";

const SIGNATURE_STORAGE_KEY = "fleetops_signature_state_";

/**
 * Persists signature state to localStorage.
 */
function saveSignatureState(stopId, name, signatureData) {
  localStorage.setItem(
    SIGNATURE_STORAGE_KEY + stopId,
    JSON.stringify({ name, signatureData }),
  );
}

/**
 * Loads signature state from localStorage.
 */
function loadSignatureState(stopId) {
  try {
    const saved = localStorage.getItem(SIGNATURE_STORAGE_KEY + stopId);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

/**
 * MOUNT: Initializes the signature view logic.
 */
export async function mount(rootElement) {
  const view = rootElement || document;
  const canvas = view.querySelector(".signature-pad");
  const clearBtn = view.querySelector(".clear-btn");
  const placeholder = view.querySelector(".canvas-placeholder");
  const backBtn = view.querySelector(".back-btn");
  const nameInput = view.querySelector(".customer-name");
  const confirmBtn = view.querySelector(".confirm-btn");
  const timestampEl = view.querySelector(".current-timestamp");

  const jobIdEl = view.querySelector(".data-job-id");
  const geolocationEl = view.querySelector(".data-geolocation");

  if (!canvas || !clearBtn || !nameInput || !confirmBtn) return;

  const ctx = canvas.getContext("2d");
  let isDrawing = false;
  let hasSignature = false;

  let stopId = localStorage.getItem("current_stop_id");
  let routeId = null;
  let stop = null;

  // --- Hydration ---
  try {
    let driverId = localStorage.getItem("driver_id");
    if (!driverId) {
      console.warn(
        "No driver_id found in localStorage. Falling back to driver_1 for testing.",
      );
      driverId = "driver_1";
    }

    if (driverId) {
      const routes = await getDriverRoutes(driverId);
      const activeRoute = routes.find((r) => r.status === "active");
      if (activeRoute) {
        routeId = activeRoute.route_id;

        if (stopId) {
          stop = activeRoute.stops.find((s) => s.stop_id === stopId);
        }
        if (!stop) {
          stop =
            activeRoute.stops.find((s) => s.status === "pending") ||
            activeRoute.stops[0];
          if (stop) {
            stopId = stop.stop_id;
            localStorage.setItem("current_stop_id", stopId);
          }
        }
      }
    }

    if (stop && routeId) {
      if (jobIdEl) jobIdEl.textContent = `JOB #${routeId}`;
      if (geolocationEl) {
        geolocationEl.innerHTML = `<strong>${Math.abs(stop.coords.lat)}&deg; ${stop.coords.lat >= 0 ? "N" : "S"},<br>${Math.abs(stop.coords.lng)}&deg; ${stop.coords.lng >= 0 ? "E" : "W"}</strong>`;
      }
    }
  } catch (err) {
    console.error("Failed to hydrate signature view:", err);
  }

  // ── Navigation ─────────────────────────────
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.pushState({}, "", "/qr-scan-page");
      window.dispatchEvent(new Event("popstate"));
    });
  }

  // ── Timestamp ─────────────────────────────
  if (timestampEl) {
    const now = new Date();
    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const month = months[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    timestampEl.innerHTML = `${month} ${date}, ${year} -<br>${hours}:${minutes}`;
  }

  // ── Signature Logic ────────────────────────
  function resizeCanvas() {
    const data = canvas.toDataURL();
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 180;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#212121";

    if (hasSignature || loadSignatureState(stopId)?.signatureData) {
      const img = new Image();
      const saved = loadSignatureState(stopId);
      img.src = data.length > 1000 ? data : saved ? saved.signatureData : "";
      if (img.src) {
        img.onload = () => ctx.drawImage(img, 0, 0);
      }
      if (placeholder) placeholder.style.display = "none";
    }
  }

  window.addEventListener("resize", resizeCanvas);
  setTimeout(resizeCanvas, 0); // Ensure layout is settled

  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function startDrawing(e) {
    if (e.type === "touchstart") e.preventDefault();
    isDrawing = true;
    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    if (!hasSignature) {
      hasSignature = true;
      canvas.dataset.hasSignature = "true";
      checkValidity();
      if (placeholder) placeholder.style.display = "none";
    }
  }

  function draw(e) {
    if (!isDrawing) return;
    if (e.type === "touchmove") e.preventDefault();
    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (isDrawing) {
      ctx.closePath();
      isDrawing = false;
      saveSignatureState(stopId, nameInput.value, canvas.toDataURL());
    }
  }

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  window.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("touchstart", startDrawing, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  window.addEventListener("touchend", stopDrawing);

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
    canvas.dataset.hasSignature = "false";
    checkValidity();
    if (placeholder) placeholder.style.display = "flex";
    saveSignatureState(stopId, nameInput.value, null);
  });

  // ── Validation Logic ───────────────────────
  function checkValidity() {
    const hasName = nameInput.value.trim().length > 0;
    const isSigned = canvas.dataset.hasSignature === "true";
    if (hasName && isSigned) {
      confirmBtn.removeAttribute("disabled");
    } else {
      confirmBtn.setAttribute("disabled", "true");
    }
  }

  nameInput.addEventListener("input", () => {
    checkValidity();
    const sig =
      canvas.dataset.hasSignature === "true" ? canvas.toDataURL() : null;
    saveSignatureState(stopId, nameInput.value, sig);
  });

  confirmBtn.addEventListener("click", async () => {
    if (!confirmBtn.hasAttribute("disabled")) {
      // Officially mark stop as delivered in the API
      if (routeId && stopId) {
        try {
          // Capture the canvas content
          const base64Sig = canvas.toDataURL("image/png");

          // Load the crypto module and encrypt
          const { generateMockKey, encryptSignature } =
            await import("../../api/crypto.js");
          const key = await generateMockKey();
          const encryptedPayload = await encryptSignature(base64Sig, key);

          // Update the mock data
          await markStopDelivered(routeId, stopId, encryptedPayload);
        } catch (e) {
          console.error("Failed to mark stop as delivered", e);
        }
      }

      window.history.pushState({}, "", "/delivery-confirm-page");
      window.dispatchEvent(new Event("popstate"));
    }
  });

  // Initial load
  const savedState = loadSignatureState(stopId);
  if (savedState) {
    if (savedState.name) nameInput.value = savedState.name;
    if (savedState.signatureData) {
      hasSignature = true;
      canvas.dataset.hasSignature = "true";
      // resizeCanvas will handle drawing the image
    }
  } else if (stop) {
    // Prefill with customer name if no saved state
    nameInput.value = stop.customer_name;
  }
  checkValidity();

  // Cleanup reference for unmount
  view._signatureResizeHandler = resizeCanvas;
  view._signatureMouseUpHandler = stopDrawing;
  view._signatureTouchEndHandler = stopDrawing;
}

/**
 * UNMOUNT: Cleans up listeners.
 */
export function unmount(rootElement) {
  const view = rootElement || document;
  window.removeEventListener("resize", view._signatureResizeHandler);
  window.removeEventListener("mouseup", view._signatureMouseUpHandler);
  window.removeEventListener("touchend", view._signatureTouchEndHandler);
}
