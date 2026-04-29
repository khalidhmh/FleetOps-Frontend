/**
 * FleetOps — Notification UI (Dynamic Injection)
 *
 * Per team-leader constraints, the Notification panel HTML and its CSS
 * are NOT placed in index.html or main.css.  Instead, this module builds
 * and injects both into the DOM at runtime, the first time the panel is
 * opened.
 *
 * Usage:
 *   import { showNotificationPanel } from './utilities/notification-ui.js';
 *   showNotificationPanel();   // call on bell-button click
 *
 * @module utilities/notification-ui
 */

import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/api/notification.js';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS — single IDs so we never inject twice
// ─────────────────────────────────────────────────────────────────

const PANEL_ID      = 'notif-panel';
const OVERLAY_ID    = 'notif-overlay';
const STYLE_ID      = 'notif-injected-styles';
const LIST_ID       = 'notif-list';
const BADGE_BTN_ID  = 'notif-badge'; // badge on the bell button in the header

// ─────────────────────────────────────────────────────────────────
// CSS — injected once into <head>
// ─────────────────────────────────────────────────────────────────

const NOTIFICATION_CSS = `
/* ── Notification Panel — Injected Styles ─────────────────────── */
#${OVERLAY_ID} {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: transparent;
}

#${PANEL_ID} {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 360px;
  max-width: 100vw;
  background: #ffffff;
  box-shadow: -4px 0 32px rgba(0,0,0,.14);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform .28s cubic-bezier(.4,0,.2,1);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

#${PANEL_ID}.notif-open {
  transform: translateX(0);
}

/* Header */
.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 14px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.notif-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notif-bell-icon {
  width: 22px;
  height: 22px;
  color: #374151;
}

.notif-title {
  font-size: 15.5px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.notif-unread-count {
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}

.notif-header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.notif-mark-all-btn {
  background: none;
  border: none;
  font-size: 12.5px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  transition: color .15s;
}
.notif-mark-all-btn:hover { color: #111827; }

.notif-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  transition: background .15s, color .15s;
  padding: 0;
}
.notif-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}
.notif-close-btn svg {
  width: 16px;
  height: 16px;
}

/* List */
#${LIST_ID} {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  list-style: none;
  margin: 0;
}

#${LIST_ID}::-webkit-scrollbar { width: 4px; }
#${LIST_ID}::-webkit-scrollbar-track { background: transparent; }
#${LIST_ID}::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }

/* Notification Item */
.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px 14px 16px;
  position: relative;
  cursor: pointer;
  transition: background .15s;
  border-bottom: 1px solid #f3f4f6;
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: #fafafa; }
.notif-item.unread { background: #fffbeb; }
.notif-item.unread:hover { background: #fef3c7; }

/* Unread dot */
.notif-unread-dot {
  position: absolute;
  left: 5px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

/* Icon container */
.notif-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.notif-icon-wrap svg { width: 18px; height: 18px; }

.notif-icon-wrap.breakdown  { background: #fff1f0; color: #dc2626; }
.notif-icon-wrap.insurance  { background: #fffbeb; color: #d97706; }
.notif-icon-wrap.stock      { background: #fffbeb; color: #d97706; }
.notif-icon-wrap.work-order { background: #f3f4f6; color: #6b7280; }
.notif-icon-wrap.inspection { background: #fffbeb; color: #d97706; }

/* Text block */
.notif-text { flex: 1; min-width: 0; }

.notif-item-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
  line-height: 1.3;
}
.notif-item.unread .notif-item-title { color: #111827; }

.notif-item-body {
  font-size: 12.5px;
  color: #4b5563;
  line-height: 1.45;
  margin: 0 0 5px;
}

.notif-item-time {
  font-size: 11.5px;
  color: #9ca3af;
}

/* Empty state */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: #9ca3af;
  text-align: center;
}
.notif-empty svg { width: 40px; height: 40px; margin-bottom: 12px; opacity: .45; }
.notif-empty p { font-size: 13.5px; margin: 0; }

/* Loading state */
.notif-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 10px;
  color: #9ca3af;
  font-size: 13px;
}
.notif-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid #e5e7eb;
  border-top-color: #f97316;
  border-radius: 50%;
  animation: notif-spin .7s linear infinite;
}
@keyframes notif-spin { to { transform: rotate(360deg); } }
`;

// ─────────────────────────────────────────────────────────────────
// ICON HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Returns an inline SVG string for a given notification type.
 * @param {string} type
 * @returns {string}
 */
function getNotifIcon(type) {
  const icons = {
    breakdown: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    insurance: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,
    stock: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,
    'work-order': `
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
        <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    inspection: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,
  };
  return icons[type] ?? icons.inspection;
}

const CLOSE_SVG = `
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

const BELL_SVG = `
  <svg class="notif-bell-icon" viewBox="0 0 24 24" fill="none">
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159
             c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

// ─────────────────────────────────────────────────────────────────
// DOM INJECTION
// ─────────────────────────────────────────────────────────────────

/**
 * Injects the <style> tag into <head> — runs only once.
 */
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = NOTIFICATION_CSS;
  document.head.appendChild(style);
}

/**
 * Builds and injects the panel + overlay DOM — runs only once.
 * Returns the panel element.
 *
 * @returns {{ panel: HTMLElement, overlay: HTMLElement }}
 */
function injectPanel() {
  if (document.getElementById(PANEL_ID)) {
    return {
      panel:   document.getElementById(PANEL_ID),
      overlay: document.getElementById(OVERLAY_ID),
    };
  }

  // Overlay (click-outside-to-close)
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('aria-hidden', 'true');

  // Panel scaffold
  const panel = document.createElement('div');
  panel.id   = PANEL_ID;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Notifications');
  panel.innerHTML = `
    <div class="notif-header">
      <div class="notif-header-left">
        ${BELL_SVG}
        <h2 class="notif-title">Notifications</h2>
        <span class="notif-unread-count" id="notif-panel-count">…</span>
      </div>
      <div class="notif-header-right">
        <button class="notif-mark-all-btn" id="notif-mark-all-btn">Mark all read</button>
        <button class="notif-close-btn" id="notif-close-btn" aria-label="Close notifications">
          ${CLOSE_SVG}
        </button>
      </div>
    </div>
    <ul id="${LIST_ID}" role="list">
      <li class="notif-loading">
        <div class="notif-spinner"></div> Loading…
      </li>
    </ul>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  return { panel, overlay };
}

// ─────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────

/**
 * Renders the notification list items into #notif-list.
 *
 * @param {import('..services/api/notification.js').Notification[]} notifications
 */
function renderList(notifications) {
  const list = document.getElementById(LIST_ID);
  if (!list) return;

  const unreadCount = notifications.filter(n => !n.read).length;

  // Update count badge in panel header
  const countEl = document.getElementById('notif-panel-count');
  if (countEl) countEl.textContent = unreadCount;

  // Update count badge on the bell button in the dashboard header
  const bellBadge = document.getElementById(BADGE_BTN_ID);
  if (bellBadge) bellBadge.textContent = unreadCount;

  if (!notifications.length) {
    list.innerHTML = `
      <li class="notif-empty">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159
                   c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>You're all caught up!</p>
      </li>`;
    return;
  }

  list.innerHTML = notifications.map(({ id, type, title, body, time, read }) => `
    <li class="notif-item ${read ? '' : 'unread'}" data-notif-id="${id}">
      ${!read ? '<span class="notif-unread-dot"></span>' : ''}
      <div class="notif-icon-wrap ${type}">
        ${getNotifIcon(type)}
      </div>
      <div class="notif-text">
        <p class="notif-item-title">${title}</p>
        <p class="notif-item-body">${body}</p>
        <span class="notif-item-time">${time}</span>
      </div>
    </li>
  `).join('');

  // Click item → mark as read
  list.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', async () => {
      const notifId = item.dataset.notifId;
      if (item.classList.contains('unread')) {
        item.classList.remove('unread');
        item.querySelector('.notif-unread-dot')?.remove();

        await markAsRead(notifId);

        // Update counts
        const remaining = list.querySelectorAll('.notif-item.unread').length;
        if (countEl) countEl.textContent = remaining;
        if (bellBadge) bellBadge.textContent = remaining;
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// OPEN / CLOSE
// ─────────────────────────────────────────────────────────────────

/**
 * Closes and hides the notification panel.
 */
function closePanel() {
  const panel   = document.getElementById(PANEL_ID);
  const overlay = document.getElementById(OVERLAY_ID);

  if (panel) {
    panel.classList.remove('notif-open');
    panel.setAttribute('aria-hidden', 'true');
  }
  if (overlay) overlay.style.display = 'none';
}

/**
 * Opens (or creates) the notification panel and fetches fresh data.
 *
 * This is the single exported function used by the dashboard view.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function showNotificationPanel() {
  // 1. Inject CSS once
  injectStyles();

  // 2. Inject DOM once
  const { panel, overlay } = injectPanel();

  // 3. Wire up close controls (idempotent — guarded by a flag)
  if (!panel.dataset.wired) {
    panel.dataset.wired = 'true';

    document.getElementById('notif-close-btn')?.addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);

    document.getElementById('notif-mark-all-btn')?.addEventListener('click', async () => {
      await markAllAsRead();
      const notifications = await fetchNotifications();
      renderList(notifications);
    });

    // Esc key closes panel
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePanel();
    });
  }

  // 4. Show panel
  overlay.style.display = 'block';
  panel.removeAttribute('aria-hidden');
  requestAnimationFrame(() => panel.classList.add('notif-open'));

  // 5. Fetch & render notifications
  try {
    const notifications = await fetchNotifications();
    renderList(notifications);
  } catch (err) {
    console.error('[NotificationUI] Failed to fetch notifications:', err);
    const list = document.getElementById(LIST_ID);
    if (list) {
      list.innerHTML = `
        <li class="notif-empty">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <p>Could not load notifications.</p>
        </li>`;
    }
  }
}