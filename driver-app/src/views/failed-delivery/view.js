/**
 * Success Notification Logic for Failed Delivery View
 * Implemented as a simple in-app message (toast) created dynamically.
 */

// Inject required styles for the message component
const injectMessageStyles = () => {
    if (document.getElementById('ir-message-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ir-message-styles';
    style.textContent = `
        .ir-message {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 20px;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-floating);
            z-index: 1000;
            font-size: var(--font-size-sm);
            font-weight: 600;
            white-space: nowrap;
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
        
        .ir-message[hidden] {
            display: none !important;
            opacity: 0;
            transform: translate(-50%, 20px);
        }

        .ir-message:not([hidden]) {
            display: flex !important;
            opacity: 1;
            transform: translate(-50%, 0);
        }
    `;
    document.head.appendChild(style);
};

// Create the message element dynamically
const ensureMessageElement = (container) => {
    let message = document.querySelector('.ir-toast');
    if (!message) {
        message = document.createElement('div');
        message.className = 'ir-toast ir-message palette-primary';
        message.setAttribute('hidden', '');
        message.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Return protocol initiated successfully</span>
        `;
        (container || document.body).appendChild(message);
    }
    return message;
};

export function mount(rootElement) {
    injectMessageStyles();
    
    const confirmBtn = document.querySelector('.confirm-btn');
    const successMessage = ensureMessageElement(rootElement);

    if (confirmBtn && successMessage) {
        confirmBtn.addEventListener('click', () => {
            // Show message
            successMessage.removeAttribute('hidden');

            // Auto-hide after 3 seconds
            setTimeout(() => {
                successMessage.setAttribute('hidden', '');
            }, 3000);
        });
    }
}

export function unmount() {
    const message = document.querySelector('.ir-toast');
    if (message) message.remove();
}
