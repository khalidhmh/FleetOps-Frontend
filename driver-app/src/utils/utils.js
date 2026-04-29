export function handlePasswordToggle(input, btn) {
  const eyeOpen = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
  </svg>`;

  const eyeClosed = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`;

  btn.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btn.innerHTML = isPassword ? eyeClosed : eyeOpen;
    btn.setAttribute(
      "aria-label",
      isPassword ? "Hide password" : "Show password",
    );
  });
}

export function updateLayout(path) {
  const topBar = document.querySelector(".top-bar"); //
  const bottomNav = document.querySelector(".bottom-nav"); //

  if (
    path === "/login-page" ||
    path === "/pre-trip-inspection-page" ||
    path === "/failed-delivery-page" ||
    path === "/delivery-confirm-page"||
    path === "/stop-details-page"||
    path === "/qr-scan-page"||
    path === "/digital-signature-page"||
    path === "/incident-report-page"||
    path === "/break-rest-page"
  ) {
    topBar.style.display = "none";
    bottomNav.style.display = "none";
    // اختياري: خلى الـ app-content ياخد الشاشة كاملة
    document.getElementById("app-content").style.minHeight = "100vh";
  } else {
    topBar.style.display = "flex";
    bottomNav.style.display = "flex";
    document.getElementById("app-content").style.minHeight =
      "calc(100vh - 140px)";
  }
}

export function markStopDelivered(route_id, stop_id,deliveryProof = null,) {
  
  const route = routes.find((r) => r.route_id === route_id);
  if (route) {
    const stop = route.stops.find((s) => s.stop_id === stop_id);
    if (stop) {
      stop.status = "delivered";
      if (deliveryProof) {
        stop.delivery_proof = deliveryProof;
      }
      return stop;
    }
  }
  throw new Error("Stop not found");
};
