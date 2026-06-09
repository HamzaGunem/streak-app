export const TYPE_CATEGORY = {
  challenge_won:      'notify_win_loss',
  challenge_lost:     'notify_win_loss',
  checkin_done:       'notify_checkin',
  checkin_reminder:   'notify_checkin',
  challenge_cancelled:'notify_challenge_updates',
  challenge_received: 'notify_challenge_updates',
  challenge_accepted: 'notify_challenge_updates',
  challenge_declined: 'notify_challenge_updates',
}

export function loadNotifSettings(userId) {
  try {
    const s = JSON.parse(localStorage.getItem(`notif_settings_${userId}`) ?? '{}')
    return {
      notify_win_loss:         s.notify_win_loss         ?? true,
      notify_checkin:          s.notify_checkin          ?? true,
      notify_challenge_updates:s.notify_challenge_updates ?? true,
    }
  } catch {
    return { notify_win_loss: true, notify_checkin: true, notify_challenge_updates: true }
  }
}

export function sendNotifications(list) {
  return fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notifications: list }),
  }).catch(err => console.error('[notifications]', err))
}
