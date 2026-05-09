import RoutesStorage from "../../services/api/routes.js";
import RouteStopsAPI from "../../services/api/route-stops.js";

/**
 * Parses an ISO 8601 ETA string into { time, ampm } display parts.
 * e.g. "2026-05-07T15:53:00.000000Z" → { time: "3:53", ampm: "PM" }
 *
 * @param {string|null} etaString
 * @returns {{ time: string, ampm: string }}
 */
function parseETA(etaString) {
  if (!etaString) return { time: "—", ampm: "" };

  try {
    const date = new Date(etaString);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return { time: `${hours}:${minutes}`, ampm };
  } catch {
    return { time: "—", ampm: "" };
  }
}

/**
 * Renders the empty state inside the active route view.
 * @param {Element} container
 * @param {string} message
 */
function showEmptyState(container, message) {
  if (container) {
    container.innerHTML = `<p class="helper-text p-4">${message}</p>`;
  }
}

export async function mount(rootElement) {
  const view = rootElement || document;
  const routeView = view.querySelector(".active-route-view");
  const driverId = localStorage.getItem("driver_id");

  if (!driverId) {
    showEmptyState(routeView, "No driver session found. Please log in again.");
    return;
  }

  // ── Step B: Loading State ─────────────────────────────────────────────────
  // Store original HTML so we can restore the skeleton if needed
  const originalHTML = routeView ? routeView.innerHTML : "";
  if (routeView) {
    routeView.innerHTML = `
      <div class="stack" style="align-items:center;justify-content:center;padding:3rem;">
        <span class="helper-text">Loading route…</span>
      </div>`;
  }

  try {
    // ── Step C: Fetch Driver's Routes ─────────────────────────────────────────
    const routes = await RoutesStorage.getDriverRoutes(driverId);

    // ── Step D: Find an active/planned route ──────────────────────────────────
    const activeRoute = routes.find((r) => {
      const status = (r.status || "").toLowerCase();
      return status === "active" || status === "planned" || status === "in_progress";
    });

    if (!activeRoute) {
      showEmptyState(routeView, "No active route assigned at the moment.");
      return;
    }

    // ── Step E: Fetch Stops for the Route (Chained Call) ──────────────────────
    // Restore the original HTML skeleton so we can populate it
    if (routeView) routeView.innerHTML = originalHTML;

    let stops = [];
    let stopsError = false;

    try {
      stops = await RouteStopsAPI.getRouteStops(activeRoute.route_id);
    } catch (stopsErr) {
      console.error("Failed to load route stops:", stopsErr);
      stopsError = true;
    }

    // ── Step F: Render Route Metadata ───────────────────────────────────────
    const routeIdEl = view.querySelector(".data-target-route-id");
    if (routeIdEl) routeIdEl.textContent = `#RT-${activeRoute.route_id}`;

    const statusEl = view.querySelector(".data-target-status");
    if (statusEl) {
      const status = activeRoute.status || "";
      statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    const shiftEl = view.querySelector(".data-target-shift");
    if (shiftEl) shiftEl.textContent = "—";

    const vehicleEl = view.querySelector(".data-target-vehicle");
    if (vehicleEl) {
      vehicleEl.textContent = activeRoute.vehicle_id
        ? `Vehicle #${activeRoute.vehicle_id}`
        : "—";
    }

    const distanceEl = view.querySelector(".data-target-distance");
    if (distanceEl) {
      distanceEl.textContent = activeRoute.total_distance
        ? `${activeRoute.total_distance} km`
        : "—";
    }

    // ── Step H: Calculate Progress ────────────────────────────────────────────
    const completedStops = stops.filter(
      (s) => s.actual_arrival_time !== null,
    ).length;
    const totalStops = stops.length || activeRoute.total_stops || 0;
    const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

    const progressEl = view.querySelector(".data-target-progress");
    if (progressEl) progressEl.textContent = `${completedStops} / ${totalStops}`;

    const progressBarFill = view.querySelector(".data-target-progress-bar");
    if (progressBarFill) progressBarFill.style.width = `${progress}%`;
    const progressBar = view.querySelector(".route-progress-bar");
    if (progressBar) progressBar.setAttribute("aria-valuenow", progress);

    const timelineProgress = view.querySelector(".timeline-progress-line");
    if (timelineProgress) timelineProgress.style.height = `${progress}%`;

    // ── Step G: Process & Render Stops ─────────────────────────────────────────
    const activeStopTemplate = view.querySelector(".active-stop-card");
    const pendingStopTemplate = view.querySelector(".pending-stop-card");
    const stopsTimeline = view.querySelector(".stops-timeline");

    // Remove templates from DOM so we can clone them in order
    if (activeStopTemplate) activeStopTemplate.remove();
    if (pendingStopTemplate) pendingStopTemplate.remove();

    if (stopsError) {
      if (stopsTimeline) {
        const errorMsg = document.createElement("p");
        errorMsg.className = "helper-text p-4";
        errorMsg.style.color = "var(--color-error, #e53935)";
        errorMsg.textContent = "Failed to load stops. Please try again later.";
        stopsTimeline.appendChild(errorMsg);
      }
      return;
    }

    // Sort stops by stop_no for consistent rendering
    stops.sort((a, b) => (a.stop_no || 0) - (b.stop_no || 0));

    let activeStopFound = false;

    for (const stop of stops) {
      const isCompleted = stop.actual_arrival_time !== null;

      if (isCompleted) {
        // ── Render Completed Stop ─────────────────────────────────────────────
        if (pendingStopTemplate && stopsTimeline) {
          const completedCard = pendingStopTemplate.cloneNode(true);
          completedCard.className = "card completed-stop-card"; 
          
          const nameEl = completedCard.querySelector(".data-target-pending-name");
          if (nameEl) nameEl.textContent = `Stop #${stop.stop_no} (Completed)`;

          const addressEl = completedCard.querySelector(".data-target-pending-address");
          if (addressEl) addressEl.textContent = `Order #${stop.order_id}`;

          stopsTimeline.appendChild(completedCard);
        }
      } else if (!activeStopFound) {
        // ── First pending stop → Active Stop Card ─────────────────────────────
        activeStopFound = true;

        if (activeStopTemplate && stopsTimeline) {
          const activeCard = activeStopTemplate.cloneNode(true);
          activeCard.setAttribute("data-route-id", activeRoute.route_id);
          activeCard.setAttribute("data-stop-id", stop.stop_id);

          const completedStopsEl = activeCard.querySelector(".data-target-completed-stops");
          if (completedStopsEl) completedStopsEl.textContent = stop.stop_no || "—";

          const totalStopsEl = activeCard.querySelector(".data-target-total-stops");
          if (totalStopsEl) totalStopsEl.textContent = totalStops;

          const { time, ampm } = parseETA(stop.eta);
          const etaTimeEl = activeCard.querySelector(".data-target-eta-time");
          if (etaTimeEl) etaTimeEl.textContent = time;

          const etaAmPmEl = activeCard.querySelector(".data-target-eta-am-pm");
          if (etaAmPmEl) etaAmPmEl.textContent = ampm;

          const stopNameEl = activeCard.querySelector(".data-target-stop-name");
          if (stopNameEl) stopNameEl.textContent = `Stop #${stop.stop_no}`;

          const stopAddressEl = activeCard.querySelector(".data-target-stop-address");
          if (stopAddressEl) stopAddressEl.textContent = `Order #${stop.order_id}`;

          const navigateBtn = activeCard.querySelector(".navigate-btn");
          if (navigateBtn && stop.latitude && stop.longitude) {
            navigateBtn.setAttribute("data-lat", stop.latitude);
            navigateBtn.setAttribute("data-lng", stop.longitude);
          }

          // Arrived Button Logic (Must be re-attached to the cloned button)
          const arrivedBtn = activeCard.querySelector(".route-action-btn");
          if (arrivedBtn) {
              const arrivedBtnOriginalHTML = arrivedBtn.innerHTML;
              arrivedBtn.addEventListener("click", async () => {
                  arrivedBtn.disabled = true;
                  arrivedBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" /></svg> Arriving…`;
                  
                  try {
                      await RoutesStorage.markArrived(stop.stop_id);
                      arrivedBtn.style.display = "none";
                      const activeBadge = activeCard.querySelector(".active-stop-badge");
                      if (activeBadge) {
                          activeBadge.classList.add("text-success");
                          activeBadge.textContent = "Arrived ✅";
                      }
                      
                      const stopActions = activeCard.querySelector(".stop-actions");
                      if (stopActions) {
                          const detailsBtn = document.createElement("button");
                          detailsBtn.className = "button primary btn-details-link";
                          detailsBtn.innerHTML = `View Stop Details`;
                          detailsBtn.addEventListener("click", () => {
                              localStorage.setItem("current_stop_id", stop.stop_id);
                              window.history.pushState({}, "", "/stop-details-page");
                              window.dispatchEvent(new Event("popstate"));
                          });
                          stopActions.appendChild(detailsBtn);
                      }
                  } catch (err) {
                      console.error("Arrival failed", err);
                      arrivedBtn.disabled = false;
                      arrivedBtn.innerHTML = arrivedBtnOriginalHTML;
                  }
              });
          }

          const navBtnClone = activeCard.querySelector(".navigate-btn");
          navBtnClone?.addEventListener("click", (e) => {
              const lat = e.currentTarget.getAttribute("data-lat");
              const lng = e.currentTarget.getAttribute("data-lng");
              if (lat && lng) {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
              }
          });

          stopsTimeline.appendChild(activeCard);
        }
      } else {
        // ── Remaining pending stops → Cloned Pending Cards ────────────────────
        if (pendingStopTemplate && stopsTimeline) {
          const pendingCard = pendingStopTemplate.cloneNode(true);
          const pendingNameEl = pendingCard.querySelector(".data-target-pending-name");
          if (pendingNameEl) pendingNameEl.textContent = `Stop #${stop.stop_no}`;
          const pendingAddressEl = pendingCard.querySelector(".data-target-pending-address");
          if (pendingAddressEl) pendingAddressEl.textContent = `Order #${stop.order_id}`;
          stopsTimeline.appendChild(pendingCard);
        }
      }
    }

    // ── End of stops rendering ───────────────────────────────────────────────
  } catch (error) {
    console.error("Failed to load active route:", error);
    showEmptyState(routeView, "Failed to load route data. Please try again later.");
  }
}

export function unmount() {}
