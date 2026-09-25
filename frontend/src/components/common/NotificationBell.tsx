import { useEffect, useRef, useState } from "react";

import {
  getUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationApi";

import type { Notification } from "../../services/notificationApi";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread notifications
  const loadNotifications = async () => {
    try {
      const data = await getUnreadNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  // Initial load + automatic refresh every 10 seconds
  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Mark one notification as read
  const handleMarkRead = async (notificationId: number) => {
    try {
      setLoading(true);

      await markNotificationRead(notificationId);

      setNotifications((current) =>
        current.filter((notification) => notification.id !== notificationId)
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (notifications.length === 0) {
      return;
    }

    try {
      setLoading(true);

      await markAllNotificationsRead();

      setNotifications([]);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    } finally {
      setLoading(false);
    }
  };

  // Notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PICKUP_SCHEDULED":
        return "📅";

      case "PICKUP_CONFIRMED":
        return "✅";

      case "PICKUP_CANCELLED":
        return "❌";

      case "PICKUP_COMPLETED":
        return "🎉";

      default:
        return "🔔";
    }
  };

  // Format notification time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString();
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/60 text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Count */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Notifications
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount === 0
                  ? "You're all caught up"
                  : `${unreadCount} unread notification${
                      unreadCount !== 1 ? "s" : ""
                    }`}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                  🔔
                </div>

                <p className="text-sm font-semibold text-slate-700">
                  No new notifications
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  New pickup updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="group border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-base">
                      {getNotificationIcon(notification.notification_type)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {notification.title}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            handleMarkRead(notification.id)
                          }
                          disabled={loading}
                          className="shrink-0 text-[11px] font-medium text-slate-400 opacity-0 transition-opacity hover:text-emerald-600 group-hover:opacity-100 disabled:cursor-not-allowed"
                        >
                          Read
                        </button>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-[10px] text-slate-400">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}