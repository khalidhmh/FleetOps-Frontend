/**
 * Mounts the Incident Report view logic.
 * Handles GPS map redirection, file upload preview text, and submission logic.
 */
export function mount(rootElement) {
    const view = rootElement || document;
    const incidentView = view.querySelector(".incident-report-view");
    if (!incidentView) return;

    // 1. GPS Map Integration
    const mapSec = incidentView.querySelector(".map-sec");
    if (mapSec) {
        mapSec.addEventListener("click", () => {
            const lat = 37.7740;
            const lng = -122.4194;
            const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
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
        submitBtn.addEventListener("click", () => {
            // Simulated submission with alert since toast is removed from HTML
            alert("Incident Report Registered Successfully");
            
            // Navigate back to Alerts
            window.history.pushState({}, "", "/alerts");
            window.dispatchEvent(new Event("popstate"));
        });
    }
}

/**
 * Cleanup logic when leaving the view.
 */
export function unmount(rootElement) {
    // No persistent listeners to clean up
}
