// =====================================================
// ZANDO WEB — pages/notifications.js
// Notifications page
// =====================================================

import { getState } from '../js/state.js';
import { markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } from '../js/notifications.js';
import { showToast, formatRelativeTime } from '../js/utils.js';
import { navigate } from '../js/router.js';

let _selectedFilter = 'All';

export function renderNotifications(appEl) {
  const { notifications, currentUser } = getState();
  if (!currentUser) { navigate('login'); return; }

  // Filter notifications
  const filtered = filterNotifications(notifications);

  appEl.innerHTML = `
    <div class="app-layout">
      ${renderNotificationsHeader(filtered, notifications)}
      <div class="page-content">
        <div class="main-area">
          <div class="notifications-page">
            ${renderFilterChips()}
            <div class="divider" style="margin: 0.5rem 0 1.5rem 0;"></div>
            ${filtered.length === 0 ? renderEmptyNotifications() : renderNotificationsList(filtered)}
          </div>
        </div>
      </div>
    </div>
  `;

  bindNotificationEvents(filtered, notifications);
}

function filterNotifications(list) {
  switch (_selectedFilter) {
    case 'Unread':
      return list.filter(n => !n.isRead);
    case 'Orders':
      return list.filter(n => n.type === 'order');
    case 'Promos':
      return list.filter(n => n.type === 'promo');
    case 'All':
    default:
      return list;
  }
}

function renderNotificationsHeader(filtered, allNotifications) {
  const unreadFilteredCount = filtered.filter(n => !n.isRead).length;
  const hasUnread = unreadFilteredCount > 0;
  const hasItems = filtered.length > 0;

  return `
    <header class="site-header">
      <div class="header-top">
        <button class="icon-btn" id="notif-back-btn" aria-label="Go back">
          <span class="material-icons-round">arrow_back</span>
        </button>
        <div style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:white;flex:1;text-align:center;margin-left: 20px;">
          Notifications
        </div>
        <div class="header-actions" style="margin-left:0; gap: 8px; display:flex; align-items:center; min-width:44px; justify-content:flex-end;">
          ${hasUnread ? `
            <button class="btn" id="mark-all-read-btn" style="color:var(--color-primary); background:white; font-weight:700; border:none; display:flex; align-items:center; gap:4px; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; cursor:pointer;" title="Mark read">
              <span class="material-icons-round" style="font-size:1.1rem; color:var(--color-primary);">done_all</span>
              <span>Mark read</span>
            </button>
          ` : ''}
          ${hasItems ? `
            <button class="icon-btn" id="clear-all-btn" title="Clear all" style="color:white; width: 40px; height: 40px;">
              <span class="material-icons-round" style="font-size:1.4rem; color: #ff6b6b;">delete_sweep</span>
            </button>
          ` : ''}
        </div>
      </div>
    </header>
  `;
}

function renderFilterChips() {
  const filters = ['All', 'Unread', 'Orders', 'Promos'];
  return `
    <div class="filter-chips-container" style="display:flex; gap: 8px; padding: 12px 0; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;">
      ${filters.map(filter => {
        const isSelected = _selectedFilter === filter;
        return `
          <button class="filter-chip ${isSelected ? 'active' : ''}" 
            data-filter="${filter}"
            style="
              padding: 6px 16px;
              border-radius: 20px;
              border: none;
              font-size: 0.85rem;
              font-weight: ${isSelected ? '700' : '500'};
              background: ${isSelected ? 'var(--color-accent)' : '#f1f1f1'};
              color: ${isSelected ? '#000' : '#495057'};
              cursor: pointer;
              transition: all var(--transition-fast);
              white-space: nowrap;
            "
          >
            ${filter}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderEmptyNotifications() {
  return `
    <div class="empty-state" style="padding: 4rem 1rem;">
      <div style="background: #f8f9fa; border-radius: 50%; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
        <span class="material-icons-round" style="font-size: 3.5rem; color: #ced4da;">notifications_off</span>
      </div>
      <h4 style="font-family: var(--font-display); font-weight: 800; font-size: 1.25rem; margin-bottom: 0.5rem; color: #000;">All caught up!</h4>
      <p style="color: #6c757d; font-size: 0.875rem; margin-bottom: 2rem;">You have no notifications in this category.</p>
      <button class="btn btn-primary" id="empty-back-btn" style="background: var(--color-primary); color: white; padding: 0.75rem 2rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer;">GO BACK</button>
    </div>
  `;
}

function renderNotificationsList(notifications) {
  return `
    <div style="background:white;border-radius:var(--radius-xl);border:1px solid var(--color-border);overflow:hidden;box-shadow:var(--shadow-sm);">
      ${notifications.map(renderNotificationItem).join('')}
    </div>
  `;
}

function renderNotificationItem(n) {
  const iconMap = {
    order: 'local_shipping',
    promo: 'local_offer',
    system: 'info',
  };
  const icon = iconMap[n.type] || 'notifications';
  const time = formatRelativeTime(n.createdAt);

  return `
    <div class="notification-item ${n.isRead ? '' : 'unread'}" data-notif-id="${n.id}" style="${n.isRead ? '' : 'background: #FFF9E6; border-left: 3px solid var(--color-primary);'} display: flex; align-items: flex-start; justify-content: space-between; position: relative;">
      <div style="display: flex; gap: var(--space-4); flex: 1;">
        <div class="notification-icon" style="background: var(--color-primary); width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.05);">
          <span class="material-icons-round" style="color: white; font-size: 1.25rem;">${icon}</span>
        </div>
        <div class="notification-body" style="flex: 1;">
          <div class="notification-title" style="font-size: 15px; font-weight: ${n.isRead ? 'normal' : 'bold'}; color: black; display: flex; align-items: center; gap: 8px;">
            ${n.title || 'Notification'}
            ${!n.isRead ? '<span class="notification-dot" style="background: var(--color-error); width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>' : ''}
          </div>
          <div class="notification-message" style="font-size: 13px; color: #495057; margin-top: 4px; line-height: 1.3;">
            ${n.body || n.message || ''}
          </div>
          <div class="notification-time" style="font-size: 11px; color: #868e96; margin-top: 6px; font-weight: 500;">
            ${time}
          </div>
        </div>
      </div>
      <button class="notif-delete-btn" data-notif-id="${n.id}" title="Delete notification" style="flex-shrink: 0;">
        <span class="material-icons-round">delete_outline</span>
      </button>
    </div>
  `;
}

function bindNotificationEvents(filtered, allNotifications) {
  // Back buttons
  document.getElementById('notif-back-btn')?.addEventListener('click', () => history.back());
  document.getElementById('empty-back-btn')?.addEventListener('click', () => history.back());

  // Filter chips click handler
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      _selectedFilter = chip.dataset.filter;
      renderNotifications(document.getElementById('app'));
    });
  });

  // Mark all read handler
  document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
    try {
      await markAllAsRead();
      showToast('Notifications marked as read', 'success');
      renderNotifications(document.getElementById('app'));
    } catch (err) {
      showToast('Failed to update notifications', 'error');
    }
  });

  // Clear all handler
  document.getElementById('clear-all-btn')?.addEventListener('click', () => {
    // Show confirmation modal
    const modalHtml = `
      <div class="modal-overlay" id="confirm-clear-modal" style="display: flex;">
        <div class="modal-box" style="max-width: 400px; padding: 2rem; border-radius: 16px;">
          <h3 style="margin-top: 0; margin-bottom: 1rem; font-family: var(--font-display); font-weight: 800; font-size: 1.2rem; color: var(--color-text-head);">Clear all notifications?</h3>
          <p style="color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.5; margin-bottom: 2rem;">
            This will permanently delete all notifications from this list.
          </p>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button class="btn" id="confirm-cancel-btn" style="background: #f1f3f5; color: #495057; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
            <button class="btn" id="confirm-clear-btn" style="background: var(--color-error); color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700; cursor: pointer;">Clear All</button>
          </div>
        </div>
      </div>
    `;
    const modalEl = document.createElement('div');
    modalEl.innerHTML = modalHtml;
    document.body.appendChild(modalEl.firstElementChild);

    // Cancel click
    document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('confirm-clear-modal')?.remove();
    });

    // Clear click
    document.getElementById('confirm-clear-btn')?.addEventListener('click', async () => {
      try {
        document.getElementById('confirm-clear-modal')?.remove();
        await clearAllNotifications();
        showToast('Notifications cleared', 'success');
        renderNotifications(document.getElementById('app'));
      } catch (err) {
        showToast('Failed to clear notifications', 'error');
      }
    });
  });

  // Single notification item click handler
  document.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.notif-delete-btn')) return; // ignore delete clicks

      const id = item.dataset.notifId;
      const notif = filtered.find(n => n.id === id);

      if (notif && !notif.isRead) {
        try {
          await markAsRead(id);
        } catch (err) {
          console.error('Failed to mark notification as read:', err);
        }
      }

      // Handle navigation: if order type, go to orders hash route
      if (notif && notif.type === 'order') {
        navigate('orders');
      }
    });
  });

  // Delete single notification click handler
  document.querySelectorAll('.notif-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); // prevent triggering item click
      const id = btn.dataset.notifId;
      try {
        await deleteNotification(id);
        showToast('Notification deleted', 'success');
        renderNotifications(document.getElementById('app'));
      } catch (err) {
        showToast('Failed to delete notification', 'error');
      }
    });
  });
}
