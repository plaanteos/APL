import apiClient from './api';
import { isDemoMode } from './demoMode';

export type NotificationChannel = 'email' | 'whatsapp';

export interface SendNotificationInput {
  channel: NotificationChannel;
  to: string;
  subject?: string;
  message: string;
  // Opcional: usado por Balance para adjuntar el Excel del balance.
  attachBalanceExcel?: boolean;
  balanceClientId?: number;
  balanceClientName?: string;
}

export const notificationService = {
  async send(input: SendNotificationInput) {
    if (isDemoMode()) {
      // Simular envío exitoso
      return {
        success: true,
        message: `Envío simulado (${input.channel}) a ${input.to}`,
      };
    }
    const res = await apiClient.post('/notifications/send', input);
    return res.data;
  },
};
