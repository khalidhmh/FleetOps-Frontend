import { getDriverRoutes, markStopDelivered } from "../../api/index.js";

export async function mount(rootElement) {
  const view = rootElement || document;
  const driverId = localStorage.getItem("driver_id");

  if (!driverId) return;

  try {
    const routes = await getDriverRoutes(driverId);
    const activeRoute = routes.find((r) => r.status === "active");

    if (!activeRoute) {
      view.querySelector(".active-route-view").innerHTML =
        '<p class="helper-text p-4">No active route assigned at the moment.</p>';
      return;
    }

    const completedStops = activeRoute.stops.filter(
      (s) => s.status === "delivered",
    ).length;
    const totalStops = activeRoute.stops.length;
    const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

    // Route Metadata
    const routeIdEl = view.querySelector(".data-target-route-id");
    if (routeIdEl) routeIdEl.textContent = `#${activeRoute.route_id}`;

    const statusEl = view.querySelector(".data-target-status");
    if (statusEl)
      statusEl.textContent =
        activeRoute.status.charAt(0).toUpperCase() +
        activeRoute.status.slice(1);

    const shiftEl = view.querySelector(".data-target-shift");
    if (shiftEl) shiftEl.textContent = "Morning Shift"; // Mock data

    const vehicleEl = view.querySelector(".data-target-vehicle");
    if (vehicleEl) vehicleEl.textContent = "Heavy-Duty Van"; // Mock data

    const distanceEl = view.querySelector(".data-target-distance");
    if (distanceEl) distanceEl.textContent = "45 km"; // Mock data

    const progressEl = view.querySelector(".data-target-progress");
    if (progressEl)
      progressEl.textContent = `${completedStops} / ${totalStops}`;

    const progressBarFill = view.querySelector(".data-target-progress-bar");
    if (progressBarFill) progressBarFill.style.width = `${progress}%`;
    const progressBar = view.querySelector(".route-progress-bar");
    if (progressBar) progressBar.setAttribute("aria-valuenow", progress);

    const timelineProgress = view.querySelector(".timeline-progress-line");
    if (timelineProgress) timelineProgress.style.height = `${progress}%`;

    // Process Stops
    const activeStopCard = view.querySelector(".active-stop-card");
    const pendingStopTemplate = view.querySelector(".pending-stop-card");
    const stopsTimeline = view.querySelector(".stops-timeline");

    // Remove the pending stop template from DOM as we will clone it
    if (pendingStopTemplate) {
      pendingStopTemplate.remove();
    }

    let activeStopFound = false;

    for (const stop of activeRoute.stops) {
      if (stop.status === "delivered") {
        continue;
      }

      if (!activeStopFound && stop.status === "pending") {
        activeStopFound = true;

        // Active Stop
        if (activeStopCard) {
          activeStopCard.setAttribute("data-route-id", activeRoute.route_id);
          activeStopCard.setAttribute("data-stop-id", stop.stop_id);

          const completedStopsEl = activeStopCard.querySelector(
            ".data-target-completed-stops",
          );
          if (completedStopsEl) completedStopsEl.textContent = stop.stop_number;

          const totalStopsEl = activeStopCard.querySelector(
            ".data-target-total-stops",
          );
          if (totalStopsEl) totalStopsEl.textContent = totalStops;

          const [time, ampm] = stop.time_window.split(" - ")[0].split(" ");

          const etaTimeEl = activeStopCard.querySelector(
            ".data-target-eta-time",
          );
          if (etaTimeEl) etaTimeEl.textContent = time || stop.time_window;

          const etaAmPmEl = activeStopCard.querySelector(
            ".data-target-eta-am-pm",
          );
          if (etaAmPmEl) etaAmPmEl.textContent = ampm || "";

          const stopNameEl = activeStopCard.querySelector(
            ".data-target-stop-name",
          );
          if (stopNameEl) stopNameEl.textContent = stop.customer_name;

          const stopAddressEl = activeStopCard.querySelector(
            ".data-target-stop-address",
          );
          if (stopAddressEl) stopAddressEl.textContent = stop.address;

          const totalParcels = stop.parcels ? stop.parcels.length : 0;
          const parcelsCountEl = activeStopCard.querySelector(
            ".data-target-parcels-count",
          );
          if (parcelsCountEl)
            parcelsCountEl.textContent = `${totalParcels} Parcels`;

          const totalWeight = stop.parcels
            ? stop.parcels.reduce((sum, p) => sum + parseFloat(p.weight), 0)
            : 0;
          const parcelsWeightEl = activeStopCard.querySelector(
            ".data-target-parcels-weight",
          );
          if (parcelsWeightEl)
            parcelsWeightEl.textContent = `${totalWeight} kg`;

          const navigateBtn = activeStopCard.querySelector(".navigate-btn");
          if (navigateBtn) {
            navigateBtn.setAttribute("data-lat", stop.coords.lat);
            navigateBtn.setAttribute("data-lng", stop.coords.lng);
            navigateBtn.setAttribute("data-address", stop.address);
          }
        }
      } else {
        // Pending Stop
        if (pendingStopTemplate && stopsTimeline) {
          const pendingCard = pendingStopTemplate.cloneNode(true);

          const pendingNameEl = pendingCard.querySelector(
            ".data-target-pending-name",
          );
          if (pendingNameEl) pendingNameEl.textContent = stop.customer_name;

          const pendingAddressEl = pendingCard.querySelector(
            ".data-target-pending-address",
          );
          if (pendingAddressEl) pendingAddressEl.textContent = stop.address;

          stopsTimeline.appendChild(pendingCard);
        }
      }
    }

    if (!activeStopFound && activeStopCard) {
      activeStopCard.style.display = "none"; // Hide if all stops delivered
    }

    // Attach Interactions
    const navigateBtn = view.querySelector(".navigate-btn");
    navigateBtn?.addEventListener("click", (e) => {
      const address = e.currentTarget.getAttribute("data-address");
      if (address) {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(googleMapsUrl, "_blank");
      }
    });

    const arrivedBtn = view.querySelector(".route-action-btn");
    const stopActions = view.querySelector(".stop-actions");
    const activeBadge = view.querySelector(".active-stop-badge");

    async function applyArrivedState() {
      if (!arrivedBtn) return;
      const activeCard = arrivedBtn.closest(".active-stop-card");
      if (!activeCard) return;

      const routeId = activeCard.getAttribute("data-route-id");
      const stopId = activeCard.getAttribute("data-stop-id");

      if (routeId && stopId) {
        try {
          await markStopDelivered(routeId, stopId);
        } catch (err) {
          console.error("Failed to mark stop as delivered", err);
          return;
        }
      }

      arrivedBtn.classList.add("completed");
      arrivedBtn.innerHTML = `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
              </svg>
              Marked as Arrived
          `;
      arrivedBtn.disabled = true;

      if (activeBadge) {
        activeBadge.classList.add("text-success");
        activeBadge.textContent = "Stop Completed ✅";
      }

      if (!view.querySelector(".btn-details-link")) {
        const detailsBtn = document.createElement("a");
        detailsBtn.className = "button outlined btn-details-link";
        detailsBtn.href = "/stop-details-page";
        detailsBtn.setAttribute("data-link", "");
        detailsBtn.innerHTML = `
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  View Stop Details
              `;

        detailsBtn.addEventListener("click", (evt) => {
          evt.preventDefault();
          localStorage.setItem("current_stop_id", stopId);
          window.history.pushState({}, "", "/stop-details-page");
          window.dispatchEvent(new Event("popstate"));
        });

        if (stopActions && arrivedBtn) {
          stopActions.insertBefore(detailsBtn, arrivedBtn);
        }
      }

      if (timelineProgress) {
        timelineProgress.style.height = "100%";
      }

      const firstPendingCard = view.querySelectorAll(".pending-stop-card")[0];
      if (firstPendingCard) {
        firstPendingCard.classList.add("active-state");
      }
    }

    if (sessionStorage.getItem("active_route_arrived") === "true") {
      applyArrivedState();
    }

    arrivedBtn?.addEventListener("click", () => {
      sessionStorage.setItem("active_route_arrived", "true");
      applyArrivedState();
    });
  } catch (error) {
    console.error("Failed to load active route", error);
  }
}

export function unmount() {}
