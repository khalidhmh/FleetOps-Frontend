// ─────────────────────────────────────────────────────────────────────────────
//  src/utilities/notification-ui.js
//  Slide-in notification panel.
//  • All CSS is injected into <head> at runtime — no external stylesheet.
//  • Call initNotificationPanel() once (e.g. from main.js) to wire the bell.
//  • showNotificationPanel() / hideNotificationPanel() are also exported for
//    programmatic control.
// ─────────────────────────────────────────────────────────────────────────────

import NotificationApi from "../services/api/notification.js";
// ─── Constants ───────────────────────────────────────────────────────────────

const PANEL_ID       = "fo-notif-panel";
const OVERLAY_ID     = "fo-notif-overlay";
const STYLE_ID       = "fo-notif-styles";
const BADGE_ID       = "fo-notif-badge";
const BELL_SELECTOR  = "button[aria-label='Notifications']";

// ─── Style Injection ─────────────────────────────────────────────────────────

function _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const css = `
/* ── Notification overlay (click-outside to close) ── */
#${OVERLAY_ID} {
    position: fixed;
    inset: 0;
    z-index: 1099;
    background: transparent;
}

/* ── Panel shell ── */
#${PANEL_ID} {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 360px;
    max-width: 100vw;
    z-index: 1100;
    background: var(--color-surface, #fff);
    box-shadow: -6px 0 32px rgba(15,23,42,0.14);
    display: flex;
    flex-direction: column;
    font-family: var(--font-family, 'Inter', sans-serif);
    transform: translateX(100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
#${PANEL_ID}.is-open {
    transform: translateX(0);
}

/* ── Header ── */
.fo-notif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--color-border, rgba(15,23,42,0.14));
    flex-shrink: 0;
}
.fo-notif-header__title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-title, #1f2733);
    margin: 0;
}
.fo-notif-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--color-danger, #c81e1e);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
}
.fo-notif-header__actions {
    display: flex;
    align-items: center;
    gap: 4px;
}
.fo-notif-mark-all-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-primary, #3da69a);
    padding: 4px 6px;
    border-radius: 6px;
    transition: background 0.15s;
}
.fo-notif-mark-all-btn:hover {
    background: var(--color-surface-low, #eff2f6);
}
.fo-notif-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    color: var(--color-text-muted, #8e98aa);
    font-size: 18px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;
}
.fo-notif-close-btn:hover {
    background: var(--color-surface-low, #eff2f6);
    color: var(--color-text-title, #1f2733);
}

/* ── List ── */
.fo-notif-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
}
.fo-notif-list::-webkit-scrollbar { width: 4px; }
.fo-notif-list::-webkit-scrollbar-track { background: transparent; }
.fo-notif-list::-webkit-scrollbar-thumb {
    background: var(--color-surface-strong, #d4dae4);
    border-radius: 4px;
}

/* ── Individual item ── */
.fo-notif-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 20px;
    cursor: pointer;
    position: relative;
    transition: background 0.15s;
}
.fo-notif-item:hover {
    background: var(--color-surface-highest, #f5f7fa);
}
.fo-notif-item.is-unread::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary, #3da69a);
}

/* ── Icon bubble ── */
.fo-notif-icon {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
}
.fo-notif-icon--breakdown {
    background: #fff0f0;
    color: #c81e1e;
}
.fo-notif-icon--warning {
    background: #fffbeb;
    color: #d97706;
}
.fo-notif-icon--resolved {
    background: var(--color-surface-low, #eff2f6);
    color: var(--color-text-muted, #8e98aa);
}

/* ── Text block ── */
.fo-notif-text {
    flex: 1;
    min-width: 0;
}
.fo-notif-text__title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-title, #1f2733);
    margin: 0 0 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.fo-notif-text__body {
    font-size: 12px;
    color: var(--color-text-body, #495763);
    margin: 0 0 5px;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.fo-notif-text__time {
    font-size: 11px;
    color: var(--color-text-muted, #8e98aa);
    margin: 0;
}

/* ── Empty state ── */
.fo-notif-empty {
    padding: 48px 20px;
    text-align: center;
    color: var(--color-text-muted, #8e98aa);
    font-size: 13px;
}

/* ── Bell badge (unread count on the bell button) ── */
.fo-bell-wrapper {
    position: relative;
    display: inline-flex;
}
#${BADGE_ID} {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--color-danger, #c81e1e);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    border: 2px solid var(--color-surface, #fff);
    box-sizing: border-box;
}
#${BADGE_ID}[hidden] { display: none; }
    `;

    const style = document.createElement("style");
    style.id    = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
}

// ─── Icon Helpers ─────────────────────────────────────────────────────────────

/** Return a simple inline SVG / unicode icon for each notification type. */
function _iconForType(type) {
    const icons = {
        breakdown: /* lightning bolt */
            `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
             </svg>`,
        warning:
            `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0
                    0 1.73-3Z"/>
                <line x1="12" x2="12" y1="9" y2="13"/>
                <line x1="12" x2="12.01" y1="17" y2="17"/>
             </svg>`,
        resolved:
            `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" x2="12" y1="8" y2="12"/>
                <line x1="12" x2="12.01" y1="16" y2="16"/>
             </svg>`,
    };
    return icons[type] ?? icons.resolved;
}

function _iconClass(type) {
    return `fo-notif-icon fo-notif-icon--${type === "breakdown" ? "breakdown" : type === "warning" ? "warning" : "resolved"}`;
}

// ─── Panel Builder ────────────────────────────────────────────────────────────

/**
 * Create (or re-use) the panel DOM and populate it with current notifications.
 */
function _buildPanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
        panel = document.createElement("div");
        panel.id = PANEL_ID;
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "Notifications");
        document.body.appendChild(panel);
    }

    // Cache is populated by the caller (showNotificationPanel calls refresh() first)
    const notifications = NotificationApi.getNotifications();
    const unreadCount   = NotificationApi.getUnreadCount();

    panel.innerHTML = /* html */ `
        <header class="fo-notif-header">
            <h2 class="fo-notif-header__title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                Notifications
                ${unreadCount > 0
                    ? `<span class="fo-notif-count-badge" aria-label="${unreadCount} unread">${unreadCount}</span>`
                    : ""}
            </h2>
            <div class="fo-notif-header__actions">
                <button class="fo-notif-mark-all-btn" data-action="mark-all-read"
                    aria-label="Mark all as read">
                    Mark all read
                </button>
                <button class="fo-notif-close-btn" data-action="close-panel"
                    aria-label="Close notifications">✕</button>
            </div>
        </header>

        <ul class="fo-notif-list" role="list">
            ${notifications.length === 0
                ? `<li class="fo-notif-empty">No notifications</li>`
                : notifications.map(_renderItem).join("")}
        </ul>
    `;

    // ── Event delegation inside the panel ──────────────────────────────────
    panel.addEventListener("click", _handlePanelClick);

    return panel;
}

function _renderItem(notification) {
    const unreadClass = notification.read ? "" : "is-unread";
    return /* html */ `
        <li class="fo-notif-item ${unreadClass}"
            data-notif-id="${notification.id}"
            role="listitem"
            aria-label="${notification.title}">
            <span class="${_iconClass(notification.type)}" aria-hidden="true">
                ${_iconForType(notification.type)}
            </span>
            <div class="fo-notif-text">
                <p class="fo-notif-text__title">${_esc(notification.title)}</p>
                <p class="fo-notif-text__body">${_esc(notification.body)}</p>
                <p class="fo-notif-text__time">${_esc(notification.timeAgo)}</p>
            </div>
        </li>
    `;
}

// ─── Overlay ─────────────────────────────────────────────────────────────────

function _getOrCreateOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = OVERLAY_ID;
        overlay.setAttribute("aria-hidden", "true");
        document.body.appendChild(overlay);
        overlay.addEventListener("click", hideNotificationPanel);
    }
    return overlay;
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

function _handlePanelClick(event) {
    const action = event.target.closest("[data-action]")?.dataset.action;

    if (action === "close-panel") {
        hideNotificationPanel();
        return;
    }

    if (action === "mark-all-read") {
        NotificationApi.markAllRead();
        _refreshPanel();
        _refreshBadge();
        return;
    }

    // Click on a notification item → mark it read
    const item = event.target.closest("[data-notif-id]");
    if (item) {
        NotificationApi.markRead(item.dataset.notifId);
        item.classList.remove("is-unread");
        _refreshBadge();
    }
}

/** Re-render only the list portion (cheap update). */
function _refreshPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const notifications = NotificationApi.getNotifications();
    const unreadCount   = NotificationApi.getUnreadCount();

    const countEl = panel.querySelector(".fo-notif-count-badge");
    if (countEl) {
        if (unreadCount > 0) {
            countEl.textContent = String(unreadCount);
        } else {
            countEl.remove();
        }
    }

    const list = panel.querySelector(".fo-notif-list");
    if (list) {
        list.innerHTML = notifications.length === 0
            ? `<li class="fo-notif-empty">No notifications</li>`
            : notifications.map(_renderItem).join("");
    }
}

/** Update the red badge count on the bell button. */
function _refreshBadge() {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) return;

    const count = NotificationApi.getUnreadCount();
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden      = count === 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Show the notification panel.
 * Fetches fresh data from the backend before rendering.
 */
export async function showNotificationPanel() {
    _injectStyles();

    // Show a loading skeleton while we fetch
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
        panel = document.createElement("div");
        panel.id = PANEL_ID;
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "Notifications");
        panel.innerHTML = `<div style="padding:32px;text-align:center;color:var(--color-text-muted,#8e98aa);font-size:13px;">Loading…</div>`;
        document.body.appendChild(panel);
    }
    _getOrCreateOverlay().style.display = "block";
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.getElementById(PANEL_ID)?.classList.add("is-open");
        });
    });

    // Fetch fresh data, then re-render
    await NotificationApi.refresh();
    _buildPanel();
    _refreshBadge();
}

/** Hide the notification panel. */
export function hideNotificationPanel() {
    const panel   = document.getElementById(PANEL_ID);
    const overlay = document.getElementById(OVERLAY_ID);

    panel?.classList.remove("is-open");
    if (overlay) overlay.style.display = "none";

    // Remove delegation listener to avoid duplication on next open
    panel?.removeEventListener("click", _handlePanelClick);
}

/**
 * Wire the bell button in the topbar.
 * Call this once from main.js (or any bootstrap file).
 *
 * @example
 *   import { initNotificationPanel } from './utilities/notification-ui.js';
 *   initNotificationPanel();
 */
export function initNotificationPanel() {
    _injectStyles();

    const bellBtn = document.querySelector(BELL_SELECTOR);
    if (!bellBtn) {
        // Bell button might not be in the DOM yet — wait for it.
        const observer = new MutationObserver(() => {
            const btn = document.querySelector(BELL_SELECTOR);
            if (!btn) return;
            observer.disconnect();
            _attachBellButton(btn);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return;
    }

    _attachBellButton(bellBtn);
}

function _attachBellButton(bellBtn) {
    // Wrap in a relative container so we can position the badge.
    const wrapper = document.createElement("span");
    wrapper.className = "fo-bell-wrapper";
    bellBtn.parentNode.insertBefore(wrapper, bellBtn);
    wrapper.appendChild(bellBtn);

    // Unread count badge
    const badge = document.createElement("span");
    badge.id     = BADGE_ID;
    badge.hidden = true;
    badge.setAttribute("aria-live", "polite");
    wrapper.appendChild(badge);

    // Seed the badge with live data from backend
    NotificationApi.refresh().then(() => _refreshBadge());

    bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = document.getElementById(PANEL_ID);
        if (panel?.classList.contains("is-open")) {
            hideNotificationPanel();
        } else {
            showNotificationPanel();
        }
    });
}

// ─── Tiny escape helper ───────────────────────────────────────────────────────

function _esc(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ─── Toast Notification ───────────────────────────────────────────────────────

const TOAST_CONTAINER_ID = "fo-toast-container";

function _ensureToastStyles() {
    if (document.getElementById("fo-toast-styles")) return;
    const css = `
#${TOAST_CONTAINER_ID} {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
}
.fo-toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 13.5px;
    font-weight: 600;
    font-family: var(--font-family, 'Inter', sans-serif);
    color: #fff;
    box-shadow: 0 8px 24px rgba(15,23,42,0.18);
    pointer-events: auto;
    min-width: 260px;
    max-width: 380px;
    transform: translateX(110%);
    opacity: 0;
    transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
}
.fo-toast.fo-toast--visible {
    transform: translateX(0);
    opacity: 1;
}
.fo-toast--success { background: #0f766e; }
.fo-toast--error   { background: #b91c1c; }
.fo-toast--info    { background: #0d9488; }
.fo-toast__icon { font-size: 17px; flex-shrink: 0; }
.fo-toast__msg  { flex: 1; line-height: 1.4; }
    `;
    const style = document.createElement("style");
    style.id = "fo-toast-styles";
    style.textContent = css;
    document.head.appendChild(style);
}

function _getToastContainer() {
    let container = document.getElementById(TOAST_CONTAINER_ID);
    if (!container) {
        container = document.createElement("div");
        container.id = TOAST_CONTAINER_ID;
        document.body.appendChild(container);
    }
    return container;
}

/**
 * showToast(message, type, duration)
 *
 * Displays a self-dismissing toast notification in the bottom-right corner.
 *
 * @param {string} message   — Text to display.
 * @param {'success'|'error'|'info'} [type='success']  — Colour variant.
 * @param {number} [duration=3500]  — Auto-dismiss delay in milliseconds.
 */
export function showToast(message, type = "success", duration = 3500) {
    _ensureToastStyles();
    const container = _getToastContainer();

    const icons = { success: "✓", error: "✕", info: "ℹ" };

    const toast = document.createElement("div");
    toast.className = `fo-toast fo-toast--${type}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `
        <span class="fo-toast__icon" aria-hidden="true">${icons[type] ?? icons.info}</span>
        <span class="fo-toast__msg">${_esc(message)}</span>
    `;

    container.appendChild(toast);

    // Trigger enter animation on next frame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add("fo-toast--visible"));
    });

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.remove("fo-toast--visible");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, duration);
}