import { handlePasswordToggle } from "../../utils/utils.js";
import DriverStorage from "../../services/api/drivers.js";

let loginSubmitHandler = null;

// main function to mount the view
export function mount(rootElement) {
  const passwordInput = rootElement.querySelector(".password-input");
  const toggleBtn = rootElement.querySelector(".toggle-password-btn");

  if (passwordInput && toggleBtn) {
    handlePasswordToggle(passwordInput, toggleBtn);
  }

  const loginForm = rootElement.querySelector(".login-form");

  if (loginForm) {
    // Dynamically create an error banner element if it doesn't exist
    let errorBanner = rootElement.querySelector(".error-banner");
    if (!errorBanner) {
      errorBanner = document.createElement("div");
      errorBanner.className = "error-banner";
      errorBanner.style.display = "none";

      const submitBtn = loginForm.querySelector(".sign-in-btn");
      if (submitBtn) {
        loginForm.insertBefore(errorBanner, submitBtn);
      } else {
        loginForm.appendChild(errorBanner);
      }
    }

    loginSubmitHandler = async (e) => {
      e.preventDefault();

      const email = rootElement.querySelector(".email-input").value;
      const password = rootElement.querySelector(".password-input").value;

      try {
        const user = await DriverStorage.login(email, password);

        // Store user data
        localStorage.setItem("driver_id", user.id);
        if (user.name) {
          localStorage.setItem("name", user.name);
        }
        localStorage.setItem("isAuthenticated", "true");
        errorBanner.style.display = "none";
        errorBanner.textContent = "";

        // Navigate to Pre-Trip Inspection
        window.history.pushState({}, "", "/pre-trip-inspection-page");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (err) {
        // Display error in banner
        errorBanner.textContent = "Invalid Operator ID or Password.";
        errorBanner.style.display = "flex";
      }
    };

    loginForm.addEventListener("submit", loginSubmitHandler);
  }
}

// function to unmount the view and clean up
export function unmount(rootElement) {
  const loginForm = rootElement.querySelector(".login-form");
  if (loginForm && loginSubmitHandler) {
    loginForm.removeEventListener("submit", loginSubmitHandler);
  }
}
