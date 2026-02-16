import { useState } from "react";
import { z } from "zod";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";

// Schema de validación con Zod
const loginSchema = z.object({
  email: z.string()
    .min(1, "El email es requerido")
    .email("Email inválido"),
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  otp: z.string().optional(),
  backupCode: z.string().optional(),
});

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show2FA, setShow2FA] = useState(false);
  const [otp, setOtp] = useState("");
  const [backupCode, setBackupCode] = useState("");

  const validateField = (field: "email" | "password", value: string) => {
    try {
      loginSchema.shape[field].parse(value);
      setErrors(prev => ({ ...prev, [field]: "" }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: error.issues[0].message }));
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todo el formulario
    try {
      loginSchema.parse({ email, password, otp, backupCode });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Por favor corrige los errores");
        return;
      }
    }

    setIsLoading(true);

    try {
      await login(email, password, rememberMe, otp || undefined, backupCode || undefined);
      toast.success("Sesión iniciada correctamente");
    } catch (error: any) {
      console.error("Login error:", error);
      const requires2fa = !!error.response?.data?.requires2fa;
      const errorMessage = error.response?.data?.error || "Error al iniciar sesión";
      if (requires2fa) setShow2FA(true);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#033f63] to-[#28666e] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <img
            src="/apl-logo.png"
            alt="APL Dental"
            className="w-48 h-auto mx-auto"
          />
        </div>

        <div className="bg-amber-50 rounded-xl p-6 text-center">
          <p className="text-[#033f63] font-bold text-xl">
            ¡Bienvenidos a nuestra nueva herramienta
            <br />
            de gestión administrativa!
          </p>
          <p className="text-sm text-gray-700 mt-4 leading-relaxed">
            Nuestro objetivo es agilizar al máximo los tiempos administrativos para poder dedicarnos por completo a nuestro valioso trabajo manual. Al optimizar la gestión podemos concentrarnos en lo que más nos apasiona,
          </p>
          <p className="text-sm font-semibold text-[#033f63] mt-3">
            Crear Sonrisas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm mb-2 text-[#033f63]"
            >
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validateField("email", e.target.value);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e] ${errors.email ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm mb-2 text-[#033f63]"
            >
              Contraseña *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validateField("password", e.target.value);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e] ${errors.password ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-[#033f63] border-gray-300 rounded focus:ring-[#28666e]"
            />
            <label
              htmlFor="rememberMe"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Recordar sesión
            </label>
          </div>

          {/* 2FA (opcional) */}
          <div className="space-y-2">
            <button
              type="button"
              className="text-sm text-[#033f63] hover:text-[#28666e] hover:underline"
              onClick={() => setShow2FA((v) => !v)}
            >
              {show2FA ? "Ocultar 2FA" : "¿Tenés 2FA? Ingresar código"}
            </button>

            {show2FA && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="otp" className="block text-sm mb-2 text-[#033f63]">Código 2FA (OTP)</label>
                  <div className="flex justify-center">
                    <InputOTP
                      id="otp"
                      name="otp"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Si no tenés OTP, podés usar un código de respaldo.</p>
                </div>

                <div>
                  <label
                    htmlFor="backupCode"
                    className="block text-sm mb-2 text-[#033f63]"
                  >
                    Código de respaldo
                  </label>
                  <input
                    id="backupCode"
                    name="backupCode"
                    type="text"
                    autoComplete="one-time-code"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e] border-gray-300"
                    placeholder="ABCDE-FGHIJ"
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#033f63] hover:bg-[#28666e] text-white py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-[#033f63] hover:text-[#28666e] hover:underline"
              onClick={() => toast.info("Funcionalidad de recuperación de contraseña próximamente")}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}