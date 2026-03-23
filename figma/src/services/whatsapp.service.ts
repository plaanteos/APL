import { apiClient } from "./api";

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
