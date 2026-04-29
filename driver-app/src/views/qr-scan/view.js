import { getStopDetails } from "../../api/index.js";

let stream = null;
let isScanning = true;
let scanTimeout = null;
let parcelsData = [];

const QR_STORAGE_KEY = "fleetops_qr_scan_state_";

function loadParcelsState(stopId, defaultParcels) {
  try {
    const saved = localStorage.getItem(QR_STORAGE_KEY + stopId);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    /* ignore */
  }
  return defaultParcels.map((p) => ({
    id: p.parcel_id,
    type: p.type,
    weight: p.weight,
    scanned: false,
    scanTime: null,
  }));
}

function saveParcelsState(stopId, data) {
  try {
    localStorage.setItem(QR_STORAGE_KEY + stopId, JSON.stringify(data));
  } catch (e) {
    /* ignore */
  }
}

function loadJsQR() {
  return new Promise((resolve) => {
    if (window.jsQR) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export async function mount(rootElement) {
  const view = rootElement || document;
  const video = view.querySelector(".qr-video");
  const parcelList = view.querySelector(".parcel-list");
  const proceedBtn = view.querySelector(".proceed-btn");
  const scannerContainer = view.querySelector(".scanner-container");

  let stopId = localStorage.getItem("current_stop_id");

  if (!parcelList) return;

  let stop = null;
  try {
    if (stopId) {
      try {
        stop = await getStopDetails(stopId);
      } catch (err) {
        console.warn(
          "Stop not found from localStorage, falling back to first active stop.",
        );
      }
    }

    if (!stop) {
      const driverId = localStorage.getItem("driver_id");
      if (driverId) {
        const { getDriverRoutes } = await import("../../api/index.js");
        const routes = await getDriverRoutes(driverId);
        const activeRoute = routes.find((r) => r.status === "active");
        if (activeRoute) {
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

    if (!stop) return;

    // Hydrate Header Elements
    const stopNumberEl = view.querySelector(".data-stop-number");
    if (stopNumberEl) stopNumberEl.textContent = `Stop #${stop.stop_number}`;

    const customerNameEl = view.querySelector(".data-customer-name");
    if (customerNameEl)
      customerNameEl.textContent = `Recipient: ${stop.customer_name}`;

    const parcelCountEl = view.querySelector(".data-parcel-count");
    if (parcelCountEl)
      parcelCountEl.textContent = `${stop.parcels.length} Parcels`;

    const verificationTextEl = view.querySelector(".data-verification-text");
    if (verificationTextEl)
      verificationTextEl.textContent = `VERIFY ALL ${stop.parcels.length} PARCELS TO UNLOCK DELIVERY FLOW`;

    // Initialize Parcels State
    parcelsData = loadParcelsState(stopId, stop.parcels);
  } catch (error) {
    console.error("Failed to fetch stop details for QR scan", error);
    return;
  }

  function renderParcels() {
    if (!parcelList) return;
    parcelList.innerHTML = parcelsData
      .map((parcel) => {
        if (parcel.scanned) {
          return `
                    <div class="card row parcel-card scanned" data-id="${parcel.id}">
                        <div class="status-icon-box">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div class="stack parcel-details">
                            <span class="status-text">SCANNED</span>
                            <h4 class="package-id">Package ID: ${parcel.id}</h4>
                            <p class="package-meta">${parcel.type} • ${parcel.weight}</p>
                        </div>
                        <div class="parcel-time">${parcel.scanTime}</div>
                    </div>
                `;
        } else {
          return `
                    <div class="card row parcel-card not-scanned" data-id="${parcel.id}">
                        <div class="status-icon-box">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                        </div>
                        <div class="stack parcel-details">
                            <span class="status-text">NOT SCANNED</span>
                            <h4 class="package-id">Package ID: ${parcel.id}</h4>
                            <p class="package-meta">${parcel.type} • ${parcel.weight}</p>
                        </div>
                        <button class="manual-scan-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                    </div>
                `;
        }
      })
      .join("");

    checkProceedStatus();
  }

  function checkProceedStatus() {
    if (!proceedBtn) return;
    const allScanned = parcelsData.every((p) => p.scanned);
    if (allScanned) {
      proceedBtn.removeAttribute("disabled");
      proceedBtn.classList.remove("secondary");
      proceedBtn.classList.add("primary");
    } else {
      proceedBtn.setAttribute("disabled", "true");
      proceedBtn.classList.remove("primary");
      proceedBtn.classList.add("secondary");
    }
  }

  const canvasElement = document.createElement("canvas");
  const canvas = canvasElement.getContext("2d");

  function tick() {
    if (!isScanning) return;
    if (!video) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;
      canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
      const imageData = canvas.getImageData(
        0,
        0,
        canvasElement.width,
        canvasElement.height,
      );
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        const unscanned = parcelsData.find((p) => !p.scanned);
        if (unscanned) {
          unscanned.scanned = true;
          const now = new Date();
          unscanned.scanTime = now.toLocaleTimeString("en-GB", {
            hour12: false,
          });
          saveParcelsState(stopId, parcelsData);
          renderParcels();

          isScanning = false;
          scanTimeout = setTimeout(() => {
            isScanning = true;
            requestAnimationFrame(tick);
          }, 1500);
          return;
        }
      }
    }
    requestAnimationFrame(tick);
  }

  async function startCamera() {
    if (!video) return;

    await loadJsQR();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(
        "Camera API not available. This feature requires HTTPS or localhost.",
      );
      console.error("Camera API not available (requires HTTPS or localhost).");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
    } catch (err) {
      console.warn(
        "Could not get environment camera, falling back to default camera.",
        err,
      );
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (fallbackErr) {
        console.error("Camera access denied or unavailable:", fallbackErr);
        alert("Could not access any camera: " + fallbackErr.message);
        return;
      }
    }

    if (stream) {
      video.srcObject = stream;
      video.setAttribute("playsinline", true);
      await video.play().catch((e) => console.error("Video play error:", e));
      requestAnimationFrame(tick);
    }
  }

  if (scannerContainer) {
    scannerContainer.addEventListener("click", () => {
      const unscanned = parcelsData.find((p) => !p.scanned);
      if (unscanned) {
        unscanned.scanned = true;
        const now = new Date();
        unscanned.scanTime = now.toLocaleTimeString("en-GB", { hour12: false });
        saveParcelsState(stopId, parcelsData);
        renderParcels();
      }
    });
  }

  if (proceedBtn) {
    proceedBtn.addEventListener("click", () => {
      if (parcelsData.every((p) => p.scanned)) {
        window.history.pushState({}, "", "/digital-signature-page");
        window.dispatchEvent(new Event("popstate"));
      }
    });
  }

  renderParcels();
  startCamera();
}

export function unmount() {
  isScanning = false;
  if (scanTimeout) clearTimeout(scanTimeout);

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}
