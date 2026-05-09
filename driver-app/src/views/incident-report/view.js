import IncidentStorage from "../../services/api/incidents.js";

/**
 * Mounts the Incident Report view logic.
 * Handles GPS map redirection, file upload preview text, and submission logic.
 */
export function mount(rootElement) {
    const view = rootElement || document;
    const incidentView = view.querySelector(".incident-report-view");
    if (!incidentView) return;

    let currentLat = 37.7740;
    let currentLng = -122.4194;

    const coordinatesValue = incidentView.querySelector(".coordinates-value");

    // Get current position
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;
                if (coordinatesValue) {
                    coordinatesValue.innerText = `${currentLat.toFixed(4)}° N, ${Math.abs(currentLng).toFixed(4)}° ${currentLng < 0 ? 'W' : 'E'}`;
                }
            },
            (error) => {
                let errorMsg = "Unknown error";
                switch(error.code) {
                    case error.PERMISSION_DENIED: errorMsg = "Permission denied. Please allow location access in your browser."; break;
                    case error.POSITION_UNAVAILABLE: errorMsg = "Location information is unavailable."; break;
                    case error.TIMEOUT: errorMsg = "The request timed out."; break;
                }
                alert("Could not detect live location: " + errorMsg);
                console.warn("Geolocation denied or failed, using fallback coordinates.", error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        alert("Geolocation is not supported by your browser or you are not using a secure (HTTPS/localhost) connection.");
    }

    // 1. GPS Map Integration
    const mapSec = incidentView.querySelector(".map-sec");
    if (mapSec) {
        mapSec.addEventListener("click", () => {
            const mapUrl = `https://www.google.com/maps?q=${currentLat},${currentLng}`;
            window.open(mapUrl, "_blank");
        });
    }

    // 2. Evidence Capture / File Upload Preview
    const fileInput = incidentView.querySelector(".evidence-capture input");
    const evidenceSubtitle = incidentView.querySelector(".evidence-subtitle");
    if (fileInput && evidenceSubtitle) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const count = e.target.files.length;
                evidenceSubtitle.textContent = `${count} photo${count !== 1 ? "s" : ""} selected`;
            } else {
                evidenceSubtitle.textContent = "Attach up to 3 photos";
            }
        });
    }

    // 3. Submission Logic
    const submitBtn = incidentView.querySelector(".submit-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
            const categorySelect = incidentView.querySelector(".incident-category");
            const detailsTextarea = incidentView.querySelector(".incident-details");
            
            const driverId = parseInt(localStorage.getItem("driver_id") || "0", 10);
            const vehicleId = parseInt(localStorage.getItem("active_vehicle_id") || "1", 10); // Assume 1 if not set
            const type = categorySelect ? categorySelect.options[categorySelect.selectedIndex].text : "Other";
            const description = detailsTextarea ? detailsTextarea.value.trim() : "";

            if (!description) {
                alert("Please provide details for the incident report.");
                return;
            }

            // Derive severity (basic heuristic based on UI dropdown options)
            let severity = "medium";
            if (type.toLowerCase() === "accident") severity = "critical";
            else if (type.toLowerCase() === "breakdown") severity = "high";

            const payload = {
                driver_id: driverId,
                vehicle_id: vehicleId,
                type: type,
                severity: severity,
                description: description,
                latitude: currentLat,
                longitude: currentLng,
                photo_urls: [
                    "https://dummy-url.com/photo.jpg" // Dummy URL as requested
                ],
                incident_ts: new Date().toISOString()
            };

            const originalContent = submitBtn.innerHTML;
            submitBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
                </svg>
                SUBMITTING...
            `;
            submitBtn.disabled = true;

            try {
                await IncidentStorage.submitIncidentReport(payload);
                alert("Incident Report Registered Successfully");
                
                // Navigate back to Alerts
                window.history.pushState({}, "", "/alerts-page");
                window.dispatchEvent(new Event("popstate"));
            } catch (error) {
                console.error("Incident submission failed:", error);
                const errMsg = error.data?.message || error.message || 'Unknown error';
                alert(`Failed to submit incident report: ${errMsg}`);
                
                // Restore button
                submitBtn.innerHTML = originalContent;
                submitBtn.disabled = false;
            }
        });
    }
}

/**
 * Cleanup logic when leaving the view.
 */
export function unmount(rootElement) {
    // No persistent listeners to clean up
}
