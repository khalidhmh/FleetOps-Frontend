import OrdersAPI from "../../services/api/orders.js";
import RouteStopsAPI from "../../services/api/route-stops.js";

/**
 * Delivery Complete View Module
 * Senior Frontend Implementation
 */
export async function mount(rootElement) {
  if (!rootElement) return;

  // 1. State Retrieval & Debugging
  const routeId =
    localStorage.getItem("route_id") ||
    localStorage.getItem("routeId") ||
    localStorage.getItem("activeRouteId") ||
    "4";
  const expectedOrderId = localStorage.getItem("expected_order_id") || "1000";
  const currentStopId =
    localStorage.getItem("current_stop_id") ||
    localStorage.getItem("currentStopId") ||
    "20005";

  console.log("[DeliveryConfirm] Debug Context:", {
    routeId,
    expectedOrderId,
    currentStopId,
  });

  // UI Element Selectors
  const recipientEl = rootElement.querySelector(".data-recipient");
  const currentStopEl = rootElement.querySelector(".data-current-stop");
  const totalStopsEl = rootElement.querySelector(".data-total-stops");
  const stopsLeftEl = rootElement.querySelector(".data-stops-left");
  const cashAmountEl = rootElement.querySelector(".data-cash-amount");
  const cashCard = rootElement.querySelector(".cash-collected-card");

  const continueBtn = rootElement.querySelector(".continue-btn");
  const viewRouteBtn = rootElement.querySelector(".view-route-btn");

  try {
    if (!routeId) throw new Error("Missing Route ID in storage.");

    // 2. Fetch Data in Parallel
    const [stopsData, ordersResponse] = await Promise.all([
      RouteStopsAPI.getRouteStops(routeId),
      OrdersAPI.getOrdersByRoute(routeId),
    ]);

    // RouteStopsAPI.getRouteStops already returns .data.data
    const stops = stopsData || [];
    // OrdersAPI returns the full response object
    const orders = ordersResponse?.data?.data || ordersResponse?.data || [];

    console.log("[DeliveryConfirm] API Responses:", {
      stopsCount: stops.length,
      ordersCount: orders.length,
    });

    // 3. Find Delivered Context with flexible matching
    const currentStop = stops.find(
      (s) => String(s.stop_id) === String(currentStopId),
    );

    // Match order by OrderID or order_id
    const order = orders.find(
      (o) =>
        String(o?.OrderID || o?.order_id) === String(expectedOrderId) ||
        o?.route_stops?.some(
          (rs) => String(rs.stop_id) === String(currentStopId),
        ),
    );

    console.log("[DeliveryConfirm] Matched Objects:", {
      hasStop: !!currentStop,
      hasOrder: !!order,
    });

    // 4. Calculations
    const totalStops = stops.length || orders.length || 0;
    const currentStopNo =
      currentStop?.stop_no ||
      order?.route_stops?.[0]?.stop_no ||
      stops.indexOf(currentStop) + 1 ||
      1;
    const remainingStops = Math.max(0, totalStops - currentStopNo);

    // 5. DOM Mapping
    if (recipientEl) {
      recipientEl.textContent =
        order?.customer?.user?.name || order?.customer?.name || "Recipient";
    }

    if (currentStopEl) {
      currentStopEl.textContent = `Stop ${currentStopNo}`;
    }
    if (totalStopsEl) {
      totalStopsEl.textContent = ` of ${totalStops}`;
    }

    if (stopsLeftEl) {
      stopsLeftEl.textContent = remainingStops;
    }

    // Conditional Cash Collected
    const paymentMethod = (
      order?.Payment_method ||
      order?.payment_method ||
      ""
    ).toUpperCase();
    if (paymentMethod.includes("COD")) {
      if (cashCard) cashCard.style.display = "flex";
      if (cashAmountEl) {
        const price = order?.Price || order?.price || "0.00";
        cashAmountEl.textContent = `EGP ${price}`;
      }
    } else {
      if (cashCard) cashCard.style.display = "none";
    }
  } catch (error) {
    console.error("[DeliveryConfirm] CRITICAL ERROR:", error);
    // Fallback for UI if something went wrong
    if (recipientEl) recipientEl.textContent = "Delivery Confirmed";
  }

  // 6. Navigation Actions
  const goHome = () => {
    window.history.pushState({}, "", "/active-route-page");
    window.dispatchEvent(new Event("popstate"));
  };

  if (continueBtn) continueBtn.addEventListener("click", goHome);
  if (viewRouteBtn) viewRouteBtn.addEventListener("click", goHome);
}

export function unmount() {}
