import OrdersAPI from "../../services/api/orders.js";

/**
 * Digital Signature View Module
 * Senior Frontend Implementation with Canvas POD logic.
 */
export async function mount(rootElement) {
  const view = rootElement || document;

  // UI Element Selectors
  const jobIdEl = view.querySelector(".data-job-id");
  const geolocationEl = view.querySelector(".data-geolocation");
  const timestampEl = view.querySelector(".current-timestamp");
  const backBtn = view.querySelector(".back-btn");
  const canvas = view.querySelector(".signature-pad");
  const clearBtn = view.querySelector(".clear-btn");
  const nameInput = view.querySelector(".customer-name");
  const confirmBtn = view.querySelector(".confirm-btn");

  // State Variables
  let isDrawing = false;
  let isCanvasEmpty = true;
  let currentCoords = { lat: 0, lng: 0 };
  const routeId =
    localStorage.getItem("route_id") || localStorage.getItem("routeId") || "4";
  const expectedOrderId = localStorage.getItem("expected_order_id") || "1006";
  const driverId = localStorage.getItem("driver_id") || 5;

  // 1. Initial State Mapping (Job ID & Timestamp)
  if (jobIdEl) jobIdEl.textContent = `JOB #${expectedOrderId}`;

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
    timestampEl.innerHTML = `<strong>${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} -<br>${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}</strong>`;
  }

  // 2. Geolocation Fetching
  if (geolocationEl) {
    geolocationEl.textContent = "Loading stop location...";
    try {
      const currentStopId =
        localStorage.getItem("current_stop_id") ||
        localStorage.getItem("currentStopId");
      const response = await OrdersAPI.getOrdersByRoute(routeId);
      const orders = response?.data?.data || [];
      const order = orders.find(
        (o) => String(o?.OrderID || o?.order_id) === String(expectedOrderId),
      );
      const stop = order?.route_stops?.find(
        (rs) => String(rs.stop_id) === String(currentStopId),
      );

      // Map coordinates for UI and Payload
      currentCoords.lat = stop?.latitude || order?.latitude || 34.3252;
      currentCoords.lng = stop?.longitude || order?.longitude || 23.2554;

      const latDir = currentCoords.lat >= 0 ? "N" : "S";
      const lngDir = currentCoords.lng >= 0 ? "E" : "W";
      geolocationEl.innerHTML = `<strong>${Math.abs(currentCoords.lat).toFixed(4)}&deg; ${latDir},<br>${Math.abs(currentCoords.lng).toFixed(4)}&deg; ${lngDir}</strong>`;
    } catch (error) {
      console.error("Geolocation fetch error:", error);
      geolocationEl.textContent = "Location unavailable";
    }
  }

  // 3. Canvas Logic (Mobile-Ready Signature Pad)
  if (canvas) {
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#212121";
    };

    const getXY = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e) => {
      isDrawing = true;
      isCanvasEmpty = false;
      validateForm();
      const { x, y } = getXY(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (e.type === "touchstart") e.preventDefault();
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const { x, y } = getXY(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (e.type === "touchmove") e.preventDefault();
    };

    const stopDrawing = () => {
      isDrawing = false;
      ctx.closePath();
    };

    // Event Listeners for Mouse and Touch
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    window.addEventListener("touchend", stopDrawing);

    // Clear Button Logic
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        isCanvasEmpty = true;
        validateForm();
      });
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  }

  // 4. Form Validation & Submission
  const validateForm = () => {
    const isNameValid = nameInput?.value?.trim() !== "";
    if (confirmBtn) confirmBtn.disabled = !(isNameValid && !isCanvasEmpty);
  };

  if (nameInput) {
    nameInput.addEventListener("input", validateForm);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      if (confirmBtn.disabled) return;

      const originalBtnText = confirmBtn.innerHTML;
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = "SAVING...";

      const payload = {
        driver_id: parseInt(driverId),
        lat: parseFloat(currentCoords.lat),
        lng: parseFloat(currentCoords.lng),
        signature: canvas.toDataURL("image/png"),
        photo: "", // Placeholder
        customer_name: nameInput.value.trim(),
        customer_signed: !isCanvasEmpty,
        is_safe_drop: false,
      };

      try {
        const response = await OrdersAPI.savePOD(expectedOrderId, payload);
        if (response?.data?.success) {
          // Navigate on Success
          window.history.pushState({}, "", "/delivery-confirm-page");
          window.dispatchEvent(new Event("popstate"));
        } else {
          throw new Error(response?.data?.message || "Submission failed");
        }
      } catch (error) {
        console.error("POD Submission Error:", error);
        alert("Failed to save delivery proof. Please try again.");
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalBtnText;
      }
    });
  }

  // Navigation back
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.pushState({}, "", "/qr-scan-page");
      window.dispatchEvent(new Event("popstate"));
    });
  }
}

export function unmount() {
  // Cleanup global listeners if necessary
}
