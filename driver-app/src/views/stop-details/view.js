import { getStopDetails } from "../../api/index.js";

export async function mount(rootElement) {
  const view = rootElement || document;
  const container = view.querySelector(".stop-details-container");

  let stopId = localStorage.getItem("current_stop_id");

  if (!container) return;

  try {
    let stop = null;
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
            localStorage.setItem("current_stop_id", stop.stop_id);
          }
        }
      }
    }

    if (!stop) return;

    // --- Data Hydration ---

    // 1. Header / Basic Info
    const stopNumberEl = view.querySelector(".data-stop-number");
    if (stopNumberEl) stopNumberEl.textContent = `STOP #${stop.stop_number}`;

    const statusEl = view.querySelector(".data-status");
    if (statusEl) {
      statusEl.textContent =
        stop.status === "delivered" ? "COMPLETED" : "PENDING SCAN";
    }

    const customerNameEl = view.querySelector(".data-customer-name");
    if (customerNameEl) customerNameEl.textContent = stop.customer_name;

    const addressEl = view.querySelector(".data-address");
    if (addressEl) {
      addressEl.innerHTML = stop.address.replace(/, /g, ",<br>");
    }

    // 2. Window and Payment Grid
    const timeWindowEl = view.querySelector(".data-time-window");
    if (timeWindowEl)
      timeWindowEl.innerHTML = stop.time_window.replace(" - ", " —<br>");

    const etaEl = view.querySelector(".data-eta");
    if (etaEl) etaEl.textContent = `ETA: ${stop.eta_minutes} min`;

    const paymentAmountEl = view.querySelector(".data-payment-amount");
    if (paymentAmountEl) {
      paymentAmountEl.textContent = `${stop.payment.currency} ${stop.payment.amount.toFixed(2)}`;
    }

    const paymentStatusEl = view.querySelector(".data-payment-status");
    if (paymentStatusEl) {
      if (stop.payment.cod_required) {
        paymentStatusEl.textContent = "COD REQUIRED";
        paymentStatusEl.className = "label text-danger m-0 data-payment-status";
      } else {
        paymentStatusEl.textContent = "PAID";
        paymentStatusEl.className =
          "label text-success m-0 data-payment-status";
      }
    }

    // 3. Contact & Instructions
    const phoneEl = view.querySelector(".data-phone-number");
    if (phoneEl) phoneEl.textContent = stop.phone_number;

    const instructionsEl = view.querySelector(".data-special-instructions");
    if (instructionsEl) {
      instructionsEl.textContent = `"${stop.special_instructions || "None"}"`;
    }

    // 4. Parcels List Rendering
    const parcelCountHeaderEl = view.querySelector(".data-parcel-count-header");
    if (parcelCountHeaderEl) {
      parcelCountHeaderEl.textContent = `PARCEL LIST (${stop.parcels.length})`;
    }

    const parcelStatusEl = view.querySelector(".data-parcel-status");
    if (parcelStatusEl) {
      parcelStatusEl.textContent =
        stop.status === "delivered" ? "Delivered" : "Awaiting";
    }

    const parcelsListContainer = view.querySelector(".parcels-list");
    const parcelTemplate = view.querySelector(".parcel-card-template");

    if (parcelsListContainer && parcelTemplate) {
      // Clear existing parcels except the template
      Array.from(parcelsListContainer.children).forEach((child) => {
        if (!child.classList.contains("parcel-card-template")) {
          child.remove();
        }
      });

      // Inject cloned parcel cards
      stop.parcels.forEach((parcel) => {
        const clone = parcelTemplate.cloneNode(true);
        clone.style.display = ""; // Remove display: none
        clone.classList.remove("parcel-card-template");

        const idEl = clone.querySelector(".data-parcel-id");
        if (idEl) idEl.textContent = `Parcel #${parcel.parcel_id}`;

        const detailsEl = clone.querySelector(".data-parcel-details");
        if (detailsEl)
          detailsEl.textContent = `${parcel.type} • ${parcel.weight}`;

        const iconEl = clone.querySelector(".data-parcel-icon");
        if (iconEl) {
          const color =
            parcel.status === "delivered"
              ? "var(--color-success)"
              : "var(--color-danger)";
          iconEl.setAttribute("stroke", color);
        }

        parcelsListContainer.appendChild(clone);
      });
    }

    // --- Event Listeners ---

    // Navigation Logic
    const navigateBtn = view.querySelector(".navigate-btn");
    if (navigateBtn) {
      navigateBtn.addEventListener("click", () => {
        const url = `https://www.google.com/maps?q=${stop.coords.lat},${stop.coords.lng}`;
        window.open(url, "_blank");
      });
    }

    // Report Issue Logic
    const reportBtn = view.querySelector(".report-issue-btn");
    const reportContainer = view.querySelector(".report-container");
    if (reportBtn && reportContainer) {
      reportBtn.addEventListener("click", () => {
        if (!view.querySelector(".report-issue-textarea")) {
          const textarea = document.createElement("textarea");
          textarea.className = "issue-textarea report-issue-textarea";
          textarea.placeholder = "Describe the issue...";

          const submitBtn = document.createElement("button");
          submitBtn.className = "button primary submit-issue-btn";
          submitBtn.innerText = "Submit Report";

          submitBtn.addEventListener("click", () => {
            alert("Issue reported!");
            textarea.remove();
            submitBtn.remove();
            reportBtn.style.display = "flex";
          });

          reportContainer.appendChild(textarea);
          reportContainer.appendChild(submitBtn);
          reportBtn.style.display = "none";
        }
      });
    }
  } catch (error) {
    console.error("Failed to fetch stop details", error);
  }
}

export function unmount() {
  // Cleanup logic if needed
}
