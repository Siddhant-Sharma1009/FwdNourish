import api from "./api";

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const response = await api.get<Notification[]>(
    "/notifications/"
  );

  return response.data;
}

export async function getUnreadNotifications(): Promise<
  Notification[]
> {
  const response = await api.get<Notification[]>(
    "/notifications/unread"
  );

  return response.data;
}

export async function markNotificationRead(
  notificationId: number
): Promise<{ message: string }> {
  const response = await api.patch<{ message: string }>(
    `/notifications/${notificationId}/read`
  );

  return response.data;
}


export async function markAllNotificationsRead(): Promise<{
  message: string;
}> {
  const response = await api.patch<{
    message: string;
  }>("/notifications/read-all");

  return response.data;
}