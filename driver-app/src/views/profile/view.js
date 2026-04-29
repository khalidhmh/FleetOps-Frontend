import { getDriverProfile, getVehicleById } from "../../api/index.js";

export async function mount(rootElement) {
  const view = rootElement || document;

  // Fetch and render profile data
  const driverId = localStorage.getItem("driver_id");
  const profileContainer = view.querySelector(".profile-owner");

  if (driverId && profileContainer) {
    try {
      const driver = await getDriverProfile(driverId);
      profileContainer.innerHTML = `
                <div class="profile-avatar-wrapper">
                    <img class="profile-avatar" src="${driver.avatar}" alt="driver-avatar" />
                    <span class="profile-avatar-badge">A</span>
                </div>
                <div class="stack profile-meta-text">
                    <h1 class="heading-xl profile-name">${driver.name}</h1>
                    <div class="row profile-meta-chips">
                        <span class="chip neutral profile-id">ID: ${driver.license_no}</span>
                        <span class="chip success profile-status">On Duty</span>
                    </div>
                </div>
            `;

      const phoneValue = view.querySelector(".phone-value");
      if (phoneValue && driver.phone_number) {
        phoneValue.textContent = driver.phone_number;
      }

      const emailValue = view.querySelector(".driver-email");
      if (emailValue && driver.email) {
        emailValue.textContent = driver.email;
      }

      // Fetch and render vehicle data
      if (driver.assigned_vehicle_id) {
        const vehicle = await getVehicleById(driver.assigned_vehicle_id);
        const plateValue = view.querySelector(".vehicle-plate-value");
        const modelValue = view.querySelector(".vehicle-model-value");

        if (plateValue) plateValue.textContent = vehicle.plate_number;
        if (modelValue) modelValue.textContent = vehicle.model;
      }
    } catch (error) {
      console.error("Error fetching driver profile:", error);
    }
  }

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
