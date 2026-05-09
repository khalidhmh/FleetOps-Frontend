import VehicleStorage from "../../services/api/vehicles.js";
import DriverStorage from "../../services/api/drivers.js";

/**
 * Generates initials from a full name (e.g., "Ahmed Sayed" → "AS").
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export async function mount(rootElement) {
  const view = rootElement || document;

  const profileContainer = view.querySelector(".profile-owner");
  const phoneValue = view.querySelector(".phone-value");
  const emailValue = view.querySelector(".driver-email");
  const plateValue = view.querySelector(".vehicle-plate-value");
  const modelValue = view.querySelector(".vehicle-model-value");

  // ── Step A: Read IDs from localStorage ──────────────────────────────────────
  const driverId = localStorage.getItem("driver_id");
  const vehicleId = localStorage.getItem("vehicle_id") || 1;

  if (!driverId) {
    if (profileContainer) {
      profileContainer.innerHTML = `
        <p class="helper-text" style="text-align:center;padding:1rem;">
          No driver session found. Please log in again.
        </p>`;
    }
    return;
  }

  // ── Loading State ───────────────────────────────────────────────────────────
  if (profileContainer) {
    profileContainer.innerHTML = `
      <div class="stack" style="align-items:center;padding:1.5rem;">
        <span class="helper-text">Loading profile…</span>
      </div>`;
  }
  if (phoneValue) phoneValue.textContent = "…";
  if (emailValue) emailValue.textContent = "…";
  if (plateValue) plateValue.textContent = "…";
  if (modelValue) modelValue.textContent = "…";

  // ── Step B: Fetch Data in Parallel ──────────────────────────────────────────
  const [driverResult, vehicleResult] = await Promise.allSettled([
    DriverStorage.getDriverProfile(driverId),
    VehicleStorage.getVehicleById(vehicleId),
  ]);

  // ── Step C: Render Driver Data ──────────────────────────────────────────────
  if (driverResult.status === "fulfilled") {
    const user = driverResult.value;

    if (profileContainer) {
      const initials = getInitials(user.name);
      const isActive = user.is_active;
      const statusLabel = isActive ? "Active" : "Inactive";
      const statusChipClass = isActive ? "success" : "neutral";

      profileContainer.innerHTML = `
        <div class="profile-avatar-wrapper">
            <div class="profile-avatar profile-initials">${initials}</div>
            <span class="profile-avatar-badge">A</span>
        </div>
        <div class="stack profile-meta-text">
            <h1 class="heading-xl profile-name">${user.name}</h1>
            <div class="row profile-meta-chips">
                <span class="chip neutral profile-id">ID: ${user.user_id}</span>
                <span class="chip ${statusChipClass} profile-status">${statusLabel}</span>
            </div>
        </div>`;
    }

    if (phoneValue) phoneValue.textContent = user.phone_no || "—";
    if (emailValue) emailValue.textContent = user.email || "—";
  } else {
    console.error("Error fetching driver profile:", driverResult.reason);
    if (profileContainer) {
      profileContainer.innerHTML = `
        <p class="helper-text" style="text-align:center;padding:1rem;color:var(--color-error, #e53935);">
          Could not load profile. Please try again later.
        </p>`;
    }
    if (phoneValue) phoneValue.textContent = "—";
    if (emailValue) emailValue.textContent = "—";
  }

  // ── Step D: Render Vehicle Data ─────────────────────────────────────────────
  if (vehicleResult.status === "fulfilled") {
    const vehicle = vehicleResult.value;

    if (plateValue) plateValue.textContent = vehicle.VehicleLicense || "—";
    if (modelValue) modelValue.textContent = vehicle.VehicleModel || "—";
  } else {
    console.error("Error fetching vehicle data:", vehicleResult.reason);
    if (plateValue) plateValue.textContent = "Unavailable";
    if (modelValue) modelValue.textContent = "Unavailable";
  }

  // ── Logout Handler ──────────────────────────────────────────────────────────
  const logoutBtn = rootElement.querySelector(".logout-button");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Clear the authentication data from storage
      localStorage.removeItem("isAuthenticated");

      // Optionally clear any other user-specific session data
      localStorage.removeItem("activeRoute");

      // Crucial: Hide global UI elements for immediate feedback
      const bottomNav = document.querySelector(".bottom-nav");
      if (bottomNav) {
        bottomNav.style.display = "none";

        // Reset active states on navigation
        const navItems = bottomNav.querySelectorAll(".nav-item");
        navItems.forEach((item) => item.classList.remove("active"));
      }

      const topBar = document.querySelector(".top-bar");
      if (topBar) {
        topBar.style.display = "none";
      }

      // Reset app content height for the login page
      const appContent = document.getElementById("app-content");
      if (appContent) {
        appContent.style.minHeight = "100vh";
      }

      // Redirect to login page
      // We use replaceState to prevent the user from going back to the profile
      window.history.replaceState({}, "", "/login-page");
      window.dispatchEvent(new Event("popstate"));
    });
  }
}

export function unmount(rootElement) {
  // Cleanup any specific event listeners if needed
}
