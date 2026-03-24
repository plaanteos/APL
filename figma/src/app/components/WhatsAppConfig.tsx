import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { MessageSquare, CheckCircle2, RefreshCcw, LogOut, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import whatsappService from "../../services/whatsapp.service";
import { useAuth } from "../../hooks/useAuth";

/**
 * Componente para configurar la conexión de WhatsApp Multi-usuario
 */
export function WhatsAppConfig() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "connecting" | "qr" | "connected">("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const resp = await whatsappService.getStatus(user.id);
      if (resp.connected) {
        setStatus("connected");
        setPhone(resp.phone);
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.error("Error al verificar estado:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [user]);

  const handleConnect = () => {
    if (!user?.id) return;
    setStatus("connecting");
    setQrCode(null);
    setError(null);

    const url = whatsappService.getConnectUrl(user.id);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "qr") {
          setStatus("qr");
          setQrCode(data.qr);
        } else if (data.status === "connected") {
          setStatus("connected");
          checkStatus();
          eventSource.close();
        } else if (data.status === "error") {
          setError(data.error || "Error desconocido en el servidor.");
          setStatus("idle");
          eventSource.close();
        } else if (data.status === "already_connected") {
          setStatus("connected");
          checkStatus();
          eventSource.close();
        }
      } catch (e) {
        console.error("Error parseando evento SSE:", e);
      }
    };

    eventSource.onerror = () => {
      // EventSource no da mucha info en onerror, pero suele ser timeout o desconexión
      if (status !== "connected") {
        setError("La conexión con el servidor de WhatsApp falló. Reintenta.");
        setStatus("idle");
      }
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    if (!confirm("¿Estás seguro de que quieres desconectar WhatsApp? Esto cerrará la sesión actual.")) return;
    
    try {
      setIsLoading(true);
      await whatsappService.disconnect(user.id);
      setStatus("idle");
      setQrCode(null);
      setPhone(null);
    } catch (err) {
      setError("Error al desconectar la sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#033f63]" />
        <p className="text-gray-500">Cargando estado de WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <Card className="border-t-4 border-t-[#033f63] shadow-lg overflow-hidden">
        <CardHeader className="bg-[#033f63]/5 pb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${status === "connected" ? "bg-green-100" : "bg-blue-100"}`}>
              <MessageSquare className={status === "connected" ? "text-green-600" : "text-[#033f63]"} size={24} />
            </div>
            <div>
              <CardTitle className="text-xl text-[#033f63]">WhatsApp Business</CardTitle>
              <CardDescription>
                Conecta tu cuenta para enviar notificaciones automáticas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 pb-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col items-center justify-center space-y-8">
            {status === "idle" && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto grayscale opacity-50">
                  <MessageSquare size={40} className="text-gray-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800">WhatsApp Desconectado</h3>
                  <p className="text-sm text-gray-500 px-4">
                    Vicula tu cuenta para avisar a tus clientes sobre sus pedidos y recibos automáticamente.
                  </p>
                </div>
                <Button 
                  onClick={handleConnect} 
                  className="bg-[#033f63] hover:bg-[#28666e] text-white px-8 py-6 h-auto rounded-2xl text-lg font-bold shadow-lg active:scale-95 transition-all w-full"
                >
                  <RefreshCcw className="mr-3" size={20} />
                  Vincular WhatsApp
                </Button>
              </div>
            )}

            {status === "connecting" && (
              <div className="text-center space-y-6 py-4">
                <Loader2 className="h-16 w-16 animate-spin text-[#033f63] mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800">Iniciando sesión...</h3>
                  <p className="text-sm text-gray-500">Esto puede tardar unos segundos.</p>
                </div>
              </div>
            )}

            {status === "qr" && qrCode && (
              <div className="text-center space-y-6">
                <div className="bg-white p-4 rounded-3xl shadow-2xl border border-gray-100 inline-block animate-in zoom-in duration-300">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gray-800">Escanea el código</h3>
                  <div className="text-sm text-gray-600 space-y-1 bg-blue-50/50 p-4 rounded-2xl">
                    <p>1. Abre WhatsApp en tu teléfono</p>
                    <p>2. Ve a Menú o Configuración &gt; Dispositivos vinculados</p>
                    <p>3. Toca en Vincular un dispositivo</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setStatus("idle")} className="text-gray-400 hover:text-red-500">
                  Cancelar
                </Button>
              </div>
            )}

            {status === "connected" && (
              <div className="text-center space-y-8 w-full animate-in fade-in duration-500">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={48} className="text-green-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
                    <ShieldCheck size={20} className="text-[#033f63]" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight">¡WhatsApp Conectado!</h3>
                  <p className="text-gray-500 font-medium">{phone || "Cuenta vinculada"}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 w-full">
                  <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100/50 text-sm text-green-700 text-left">
                    <li className="list-none flex gap-2">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      Notificaciones de recibos automáticas
                    </li>
                    <li className="list-none flex gap-2 mt-2">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      Avisos de pedidos listos
                    </li>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleDisconnect}
                    className="border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl py-6 h-auto transition-all"
                  >
                    <LogOut className="mr-2" size={18} />
                    Desconectar dispositivo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <p className="text-center text-[10px] text-gray-300 uppercase tracking-widest font-bold">
        APL Dental Lab • WhatsApp Multi-User v1.0
      </p>
    </div>
  );
}
