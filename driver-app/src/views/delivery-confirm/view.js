import { getDriverRoutes } from "../../api/index.js";

const QR_STORAGE_KEY = "fleetops_qr_scan_state_";
const SIGNATURE_STORAGE_KEY = "fleetops_signature_state_";

function clearStopSessionData(stopId) {
  if (stopId) {
    localStorage.removeItem(QR_STORAGE_KEY + stopId);
    localStorage.removeItem(SIGNATURE_STORAGE_KEY + stopId);
  }
}

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}

export async function mount(rootElement) {
  const view = rootElement || document;

  const recipientEl = view.querySelector(".data-recipient");
  const progressEl = view.querySelector(".data-current-stop");
  const totalStopsEl = view.querySelector(".data-total-stops");
  const stopsLeftEl = view.querySelector(".data-stops-left");
  const cashAmountEl = view.querySelector(".data-cash-amount");
  const cashCardEl = view.querySelector(".cash-collected-card");

  let driverId = localStorage.getItem("driver_id");
  let stopId = localStorage.getItem("current_stop_id");
  let activeRoute = null;
  let stop = null;

  try {
    if (!driverId) {
      console.warn(
        "No driver_id found in localStorage. Falling back to driver_1 for testing.",
      );
      driverId = "driver_1";
    }

    if (driverId) {
      const routes = await getDriverRoutes(driverId);
      activeRoute = routes.find((r) => r.status === "active");
      if (activeRoute) {
        if (stopId) {
          stop = activeRoute.stops.find((s) => s.stop_id === stopId);
        }
        if (!stop) {
          // Fallback to first stop if invalid ID
          stop = activeRoute.stops[0];
          if (stop) {
            stopId = stop.stop_id;
            localStorage.setItem("current_stop_id", stopId);
          }
        }
      }
    }

    if (stop && activeRoute) {
      const totalStops = activeRoute.stops.length;
      const stopsLeft = totalStops - stop.stop_number;

      if (recipientEl) recipientEl.textContent = stop.customer_name;
      if (progressEl) progressEl.textContent = `stop ${stop.stop_number}`;
      if (totalStopsEl) totalStopsEl.textContent = `of ${totalStops}`;
      if (stopsLeftEl) stopsLeftEl.textContent = stopsLeft.toString();

      if (cashCardEl) {
        if (stop.payment.cod_required) {
          cashCardEl.style.display = "flex";
          if (cashAmountEl)
            cashAmountEl.textContent = `${stop.payment.currency} ${stop.payment.amount.toFixed(2)}`;
        } else {
          cashCardEl.style.display = "none";
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch route data for delivery confirm:", err);
  }

  // ── Continue to Next Stop ──────────────────
  const continueBtn = view.querySelector(".continue-btn");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      if (stopId) {
        clearStopSessionData(stopId);
      }
      navigateTo("/active-route-page");
    });
  }

  // ── View Route ─────────────────────────────
  const viewRouteBtn = view.querySelector(".view-route-btn");
  if (viewRouteBtn) {
    viewRouteBtn.addEventListener("click", () => {
      navigateTo("/active-route-page");
    });
  }
}

export function unmount() {
  // No persistent listeners to clean up
}
