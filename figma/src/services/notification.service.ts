import apiClient from './api';

export type NotificationChannel = 'email' | 'whatsapp';

export interface SendNotificationInput {
  channel: NotificationChannel;
  to: string;
  subject?: string;
  message: string;
}

export const notificationService = {
  async send(input: SendNotificationInput) {
    const res = await apiClient.post('/notifications/send', input);
    return res.data;
  },
};
