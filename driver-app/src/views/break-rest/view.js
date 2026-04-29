let timerInterval;

/**
 * Mounts the Break/Rest view logic.
 * Handles the 30-minute break timer with localStorage persistence.
 */
export function mount(rootElement) {
    const view = rootElement.querySelector(".break-rest-view");
    if (!view) return;

    const startBtn = view.querySelector(".start-break-btn");
    const timerDisplay = view.querySelector(".timer-display");
    const label = view.querySelector(".text-center .label");

    if (!startBtn || !timerDisplay || !label) return;

    /**
     * Updates the UI timer display (MM:SS).
     */
    function updateTimerDisplay(remainingSeconds) {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Starts the countdown timer.
     */
    function startTimer(startTime) {
        view.classList.add("on-break");
        label.textContent = "BREAK TIME REMAINING";
        
        const duration = 30 * 60; // 30 minutes in seconds
        
        if (timerInterval) clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - startTime;
            const remaining = duration - elapsed;

            if (remaining <= 0) {
                clearInterval(timerInterval);
                updateTimerDisplay(0);
                localStorage.removeItem("breakStartTime");
                view.classList.remove("on-break");
                label.textContent = "DRIVING TIME";
                
                alert("Break completed successfully!");
                // Navigate back to alerts or home
                window.history.pushState({}, "", "/alerts");
                window.dispatchEvent(new Event("popstate"));
            } else {
                updateTimerDisplay(remaining);
            }
        }, 1000);
    }

    /**
     * Checks if a break is already in progress.
     */
    function checkExistingTimer() {
        const storedTime = localStorage.getItem("breakStartTime");
        if (storedTime) {
            const startTime = parseInt(storedTime, 10);
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - startTime;
            const duration = 30 * 60;
            
            if (elapsed < duration) {
                updateTimerDisplay(duration - elapsed);
                startTimer(startTime);
            } else {
                localStorage.removeItem("breakStartTime");
            }
        }
    }

    // Event Listeners
    startBtn.addEventListener("click", () => {
        alert("You are now on a break");
        const startTime = Math.floor(Date.now() / 1000);
        localStorage.setItem("breakStartTime", startTime.toString());
        updateTimerDisplay(30 * 60);
        startTimer(startTime);
    });

    // Initialize
    checkExistingTimer();
}

/**
 * Cleans up intervals when leaving the view.
 */
export function unmount(rootElement) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
