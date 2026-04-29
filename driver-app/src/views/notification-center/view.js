/**
 * Notification Center Module
 * Handles rendering of alerts and modal interactions.
 */

const NOTIFICATIONS_DATA = [
    {
        id: 'n1',
        type: 'route',
        category: 'dispatch',
        title: 'New Route Assigned',
        desc: 'Route #87721 Metro-North Distribution Hub to Regional Port. Total distance 42.4 mi.',
        time: 'JUST NOW',
        status: 'unread',
        routeData: {
            id: '87721',
            origin: 'Metro-North Distribution Hub',
            destination: 'Regional Port',
            distance: '42.4 mi'
        }
    },
    {
        id: 'n2',
        type: 'dispatch',
        category: 'dispatch',
        title: 'Dispatch Message',
        desc: '"Traffic congestion on I-95 North near Exit 24. Suggest using detour via State Route 1."',
        from: 'Marcus (Control Center)',
        time: '12 MINS AGO',
        status: 'unread'
    },
    {
        id: 'n3',
        type: 'break',
        category: 'system',
        title: 'Break Reminder',
        desc: 'Mandatory 30-minute rest break required in the next 15 miles. ELD synchronization active.',
        time: '45 MINS AGO',
        status: 'unread'
    },
    {
        id: 'n4',
        type: 'system',
        category: 'system',
        title: 'System Updated',
        desc: 'FleetOps v2.4.1 applied successfully. Performance metrics optimized for low-latency dispatch.',
        time: '2 HOURS AGO',
        status: 'read'
    },
    {
        id: 'n5',
        type: 'warning',
        category: 'alert',
        title: 'Severe Weather Warning',
        desc: 'Flash flood warning issued for current sector. Heavy rain expected between 14:00 and 17:00.',
        time: '3 HOURS AGO',
        status: 'unread'
    }
];

export function mount(rootElement) {
    const view = rootElement || document;
    const listContainer = view.querySelector('.notification-list-container');
    const modalOverlay = view.querySelector('.notification-modal');
    const modalTitle = view.querySelector('.modal-title');
    const modalBody = view.querySelector('.modal-body');
    const modalClose = view.querySelector('.modal-close');

    if (!listContainer) return;

    function render() {
        listContainer.innerHTML = '';
        
        NOTIFICATIONS_DATA.forEach(n => {
            const card = document.createElement('div');
            card.className = `notification-card type-${n.type} ${n.status}`;
            
            const iconSvg = getIconSvg(n.type);
            const extraContent = n.from ? `<p class="notification-from">From: ${n.from}</p>` : '';
            const actionBtn = n.type === 'route' ? `<button class="button primary accept-route-btn">ACCEPT ROUTE</button>` : '';

            card.innerHTML = `
                <div class="notification-icon-wrapper">${iconSvg}</div>
                <div class="notification-content">
                    <div class="notification-header-row">
                        <h4 class="notification-title">${n.title}</h4>
                        <span class="notification-time">${n.time}</span>
                    </div>
                    <p class="notification-desc">${n.desc}</p>
                    ${extraContent}
                    ${actionBtn}
                </div>
            `;

            // Card click for modal
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('accept-route-btn')) return;
                
                if (modalOverlay && modalTitle && modalBody) {
                    modalTitle.textContent = n.title;
                    modalBody.textContent = n.desc;
                    modalOverlay.classList.remove('hidden');
                }

                if (n.status === 'unread') {
                    n.status = 'read';
                    render();
                }
            });

            // Accept button logic
            const acceptBtn = card.querySelector('.accept-route-btn');
            if (acceptBtn) {
                acceptBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (n.routeData) {
                        localStorage.setItem('activeRoute', JSON.stringify(n.routeData));
                        alert('Success: New route accepted.');
                        window.history.pushState({}, '', '/active-route-page');
                        window.dispatchEvent(new Event('popstate'));
                    }
                });
            }

            listContainer.appendChild(card);
        });
    }

    function getIconSvg(type) {
        switch(type) {
            case 'route': return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
            case 'dispatch': return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
            case 'warning': return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
            default: return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>`;
        }
    }

    // Modal Close logic
    if (modalClose) {
        modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
        });
    }

    render();
}

export function unmount() {
    // No persistent listeners to clean up manually
}
