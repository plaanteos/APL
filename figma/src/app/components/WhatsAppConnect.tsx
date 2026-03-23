import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MessageSquare, RefreshCcw, LogOut, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import whatsappService from "../../services/whatsapp.service";
import { useAuth } from "../../hooks/useAuth";

const WhatsAppConnect: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'QR' | 'CONNECTED'>('IDLE');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await whatsappService.getStatus(user.id);
      if (data.connected) {
        setStatus('CONNECTED');
        setPhoneNumber(data.phone);
      } else {
        setStatus('IDLE');
      }
    } catch (err) {
      console.error("Error fetching WhatsApp status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user]);

  const handleConnect = () => {
    if (!user?.id) return;
    setStatus('CONNECTING');
    setQrCode(null);
    setError(null);

    const url = whatsappService.getConnectUrl(user.id);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'qr') {
          setStatus('QR');
          setQrCode(data.qr);
        } else if (data.status === 'connected') {
          setStatus('CONNECTED');
          fetchStatus();
          eventSource.close();
        } else if (data.status === 'error') {
          setError(data.message || 'La conexión falló');
          setStatus('IDLE');
          eventSource.close();
        }
      } catch (e) {
        console.error("Error parsing SSE data:", e);
      }
    };

    eventSource.onerror = () => {
      if (status !== 'CONNECTED') {
        setError("Error de comunicación con el servicio de WhatsApp.");
        setStatus('IDLE');
      }
      eventSource.close();
    };

    return () => eventSource.close();
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    if (!confirm("¿Desconectar sesión de WhatsApp?")) return;
    
    try {
      setLoading(true);
      await whatsappService.disconnect(user.id);
      setStatus('IDLE');
      setPhoneNumber(null);
      setQrCode(null);
    } catch (err) {
      setError("No se pudo desconectar la sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 p-2 rounded-lg">
            <MessageSquare className="text-green-600 w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">Conexión de WhatsApp</h3>
        </div>
        {status === 'CONNECTED' && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1 px-3 rounded-full flex gap-1 items-center">
            <CheckCircle2 size={12} className="text-green-600" />
            WhatsApp Conectado ✓
          </Badge>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg flex gap-2 items-center text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status === 'CONNECTED' ? (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-1">Número vinculado:</p>
            <p className="text-xl font-bold text-gray-800">{phoneNumber || "Cargando..."}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleDisconnect}
            className="w-full text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 py-6 h-auto rounded-xl font-semibold transition-all"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <LogOut className="mr-2" size={18} />}
            Desconectar WhatsApp
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 space-y-6 text-center">
          {status === 'IDLE' && (
            <>
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <MessageSquare className="text-gray-300 w-8 h-8" />
              </div>
              <div className="space-y-2">
                <p className="text-gray-600 text-sm px-4">
                  Activa el envío de notificaciones conectando tu dispositivo para enviar mensajes directos a tus clientes.
                </p>
              </div>
              <Button 
                onClick={handleConnect}
                className="w-full bg-[#033f63] hover:bg-[#28666e] text-white py-6 h-auto rounded-xl font-bold shadow-md active:scale-95 transition-all"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <RefreshCcw className="mr-2" size={18} />}
                Conectar WhatsApp
              </Button>
            </>
          )}

          {status === 'CONNECTING' && (
            <div className="py-8 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-500 font-medium">Iniciando sesión de WhatsApp...</p>
            </div>
          )}

          {status === 'QR' && (
            <div className="space-y-6 animate-in zoom-in duration-300">
              <div className="bg-white p-2 border-2 border-dashed border-gray-100 rounded-2xl shadow-sm inline-block">
                <img src={qrCode!} alt="WhatsApp QR" className="w-56 h-56" />
              </div>
              <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-full inline-flex">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">Esperando escaneo...</span>
              </div>
              <p className="text-xs text-gray-400">Escaneá el código desde WhatsApp &gt; Dispositivos vinculados</p>
              <Button variant="ghost" onClick={() => setStatus('IDLE')} className="text-gray-400 hover:text-red-500">
                Detener
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppConnect;
