import { apiClient } from "./api";

const WHATSAPP_NOT_CONNECTED_CODE = "WHATSAPP_SESSION_NOT_CONNECTED";

export const isWhatsAppSessionNotConnectedError = (error: any) => {
  const message = String(error?.response?.data?.error || error?.message || "");
  return message.includes(WHATSAPP_NOT_CONNECTED_CODE);
};

export const getWhatsAppConnectionGuidance = () => ({
  title: "WhatsApp no esta vinculado",
  description:
    "Para vincularlo, toca el icono de WhatsApp en la barra superior. Luego: 1) entra a Vincular WhatsApp, 2) abre WhatsApp en tu telefono, 3) ve a Dispositivos vinculados, 4) toca Vincular un dispositivo y 5) escanea el codigo QR.",
});

const whatsappService = {
  /**
   * Obtiene el estado de conexión para un usuario
   */
  getStatus: async (userId: string | number) => {
    try {
      const response = await apiClient.get(`/whatsapp/status/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo estado de WhatsApp:", error);
      throw error;
    }
  },

  /**
   * Desconecta y elimina la sesión
   */
  disconnect: async (userId: string | number) => {
    try {
      const response = await apiClient.delete(`/whatsapp/disconnect/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error desconectando WhatsApp:", error);
      throw error;
    }
  },

  /**
   * Genera el URL para la conexión SSE
   */
  getConnectUrl: (userId: string | number) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const baseUrl = apiClient.defaults.baseURL;
    return `${baseUrl}/whatsapp/connect?token=${token}&userId=${userId}`;
  },

  /**
   * Envía un mensaje de texto
   */
  send: async (recipientPhone: string, message: string, userId?: string | number) => {
    try {
      const response = await apiClient.post("/whatsapp/send", { recipientPhone, message, userId });
      return response.data;
    } catch (error) {
      console.error("Error enviando mensaje WhatsApp:", error);
      throw error;
    }
  }
};

export default whatsappService;
