import type {NotificationType} from "../../core/types";

const NOTIFICATION_EXIT_DELAY_MS = 250;
const NOTIFICATION_VISIBLE_DURATION_MS = 2200;

export function showNotification(message: string, type: NotificationType = "info"): void {
  document.querySelectorAll(".notification").forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.classList.add("visible");
  });

  window.setTimeout(() => {
    notification.classList.remove("visible");
    window.setTimeout(() => notification.remove(), NOTIFICATION_EXIT_DELAY_MS);
  }, NOTIFICATION_VISIBLE_DURATION_MS);
}
