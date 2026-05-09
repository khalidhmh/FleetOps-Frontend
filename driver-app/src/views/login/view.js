import { handlePasswordToggle } from "../../utils/utils.js";
import DriverStorage from "../../services/api/drivers.js";
import api from "/shared/api-handler.js";

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

      // Show loading state
      const submitBtn = loginForm.querySelector(".sign-in-btn");
      const originalBtnText = submitBtn ? submitBtn.textContent : "Sign In";
      if (submitBtn) {
        submitBtn.textContent = "Signing in...";
        submitBtn.disabled = true;
      }

      try {
        const responsePayload = await DriverStorage.login(email, password);
        const { token, user } = responsePayload.data;

        // Restrict access to Drivers only
        if (!user.role || user.role.toLowerCase() !== "driver") {
          if (submitBtn) {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
          }
          errorBanner.textContent = "Access Denied: This application is restricted to Drivers only.";
          errorBanner.style.display = "flex";
          return;
        }

        // Store user data
        localStorage.setItem("auth_token", token);
        localStorage.setItem("driver_id", user.user_id);
        if (user.name) {
          localStorage.setItem("name", user.name);
        }
        localStorage.setItem("role", user.role);
        localStorage.setItem("isAuthenticated", "true");
        
        // Set API Token globally
        api.setAuthToken(token, "Bearer");
        
        errorBanner.style.display = "none";
        errorBanner.textContent = "";

        // Navigate to dashboard
        window.history.pushState({}, "", "/pre-trip-inspection-page");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (err) {
        // Restore button state
        if (submitBtn) {
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
        }
        
        // Display error in banner
        errorBanner.textContent = err.data?.message || "Invalid Operator ID or Password.";
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
