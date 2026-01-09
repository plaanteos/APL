import { useState } from "react";
import { LogIn } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@apl-dental.com");
  const [password, setPassword] = useState("AdminAnto17$");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast.success("Sesión iniciada correctamente");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#033f63] to-[#28666e] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#7c9885]/20 rounded-full flex items-center justify-center mx-auto">
            <LogIn size={32} className="text-[#033f63]" />
          </div>
          <h1 className="text-2xl text-[#033f63]">Laboratorio Dental</h1>
          <p className="text-sm text-gray-500">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm mb-2 text-[#033f63]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e]"
              placeholder="admin@apl-dental.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm mb-2 text-[#033f63]"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e]"
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#033f63] hover:bg-[#28666e] text-white py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>

        <div className="bg-[#fedc97]/30 border border-[#b5b682]/30 rounded-lg p-4 text-sm text-[#033f63]">
          <p className="mb-1">
            <strong>Credenciales de prueba:</strong>
          </p>
          <p>Email: <strong>admin@apl-dental.com</strong></p>
          <p>Contraseña: <strong>AdminAnto17$</strong></p>
        </div>
      </Card>
    </div>
  );
}