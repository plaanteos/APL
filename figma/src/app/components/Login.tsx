import { useState } from "react";
import { LogIn } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación simple - en producción conectarías con un backend real
    if (username === "admin" && password === "1234") {
      onLogin();
    } else {
      setError("Usuario o contraseña incorrectos");
      setTimeout(() => setError(""), 3000);
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
              htmlFor="username"
              className="block text-sm mb-2 text-[#033f63]"
            >
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e]"
              placeholder="Ingresa tu usuario"
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
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#033f63] hover:bg-[#28666e] text-white py-2 rounded-lg transition-colors"
          >
            Iniciar Sesión
          </Button>
        </form>

        <div className="bg-[#fedc97]/30 border border-[#b5b682]/30 rounded-lg p-4 text-sm text-[#033f63]">
          <p className="mb-1">
            <strong>Credenciales de prueba:</strong>
          </p>
          <p>Usuario: <strong>admin</strong></p>
          <p>Contraseña: <strong>1234</strong></p>
        </div>
      </Card>
    </div>
  );
}