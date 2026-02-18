import { useState } from "react";
import { z } from "zod";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { authService } from "../../services/auth.service";

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
  const [mode, setMode] = useState<"login" | "forgot-request" | "forgot-verify" | "forgot-reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show2FA, setShow2FA] = useState(false);
  const [otp, setOtp] = useState("");
  const [backupCode, setBackupCode] = useState("");

  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const isEmailLocked = mode === "forgot-verify" || mode === "forgot-reset";

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

    if (mode !== "login") return;

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

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      loginSchema.shape.email.parse(email);
      const result = await authService.forgotPassword(email);
      toast.success(result.message || "Código enviado si el email existe");
      setMode("forgot-verify");
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "No se pudo enviar el código";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      loginSchema.shape.email.parse(email);

      if (!resetCode || resetCode.length < 6) {
        toast.error("Ingresá el código de 6 dígitos");
        return;
      }

      const result = await authService.verifyResetCode(email, resetCode);
      toast.success(result.message || "Código verificado");
      setMode("forgot-reset");
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Código inválido";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      loginSchema.shape.email.parse(email);

      if (!resetCode || resetCode.length < 6) {
        toast.error("Ingresá el código de 6 dígitos");
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        toast.error("La nueva contraseña debe tener al menos 6 caracteres");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error("Las contraseñas no coinciden");
        return;
      }

      const result = await authService.resetPasswordWithCode(email, resetCode, newPassword);
      toast.success(result.message || "Contraseña actualizada");

      setMode("login");
      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "No se pudo actualizar la contraseña";
      toast.error(message);
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

        <form
          onSubmit={
            mode === "login"
              ? handleSubmit
              : mode === "forgot-request"
                ? handleForgotRequest
                : mode === "forgot-verify"
                  ? handleForgotVerify
                  : handleForgotReset
          }
          className="space-y-4"
        >
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
              readOnly={isEmailLocked}
              onChange={(e) => {
                if (isEmailLocked) return;
                setEmail(e.target.value);
                validateField("email", e.target.value);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e] ${errors.email ? "border-red-500" : "border-gray-300"
                } ${isEmailLocked ? "bg-gray-100 cursor-not-allowed" : ""}`}
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {mode === "login" && (
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
          )}

          {mode === "login" && (
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
          )}

          {mode === "login" && show2FA && (
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

          {mode === "forgot-verify" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="resetCode" className="block text-sm mb-2 text-[#033f63]">Código de verificación</label>
                <div className="flex justify-center">
                  <InputOTP
                    id="resetCode"
                    name="resetCode"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetCode}
                    onChange={setResetCode}
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
                <p className="text-xs text-gray-500 mt-2">Revisá tu email. El código expira en 15 minutos.</p>
              </div>
            </div>
          )}

          {mode === "forgot-reset" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="resetCode" className="block text-sm mb-2 text-[#033f63]">Código de verificación</label>
                <div className="flex justify-center">
                  <InputOTP
                    id="resetCode"
                    name="resetCode"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetCode}
                    onChange={setResetCode}
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
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm mb-2 text-[#033f63]">Nueva contraseña</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e] border-gray-300"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm mb-2 text-[#033f63]">Confirmar nueva contraseña</label>
                <input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#28666e] border-gray-300"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#033f63] hover:bg-[#28666e] text-white py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {mode === "login"
              ? (isLoading ? "Iniciando sesión..." : "Iniciar Sesión")
              : mode === "forgot-request"
                ? (isLoading ? "Enviando código..." : "Enviar código")
                : mode === "forgot-verify"
                  ? (isLoading ? "Verificando..." : "Verificar código")
                  : (isLoading ? "Actualizando..." : "Cambiar contraseña")}
          </Button>

          <div className="text-center space-y-2">
            {mode === "login" ? (
              <button
                type="button"
                className="text-sm text-[#033f63] hover:text-[#28666e] hover:underline"
                onClick={() => {
                  setMode("forgot-request");
                  setShow2FA(false);
                  setOtp("");
                  setBackupCode("");
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            ) : (
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  className="text-sm text-[#033f63] hover:text-[#28666e] hover:underline"
                  onClick={() => {
                    setMode("login");
                    setResetCode("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                  }}
                >
                  Volver a iniciar sesión
                </button>

                {(mode === "forgot-verify" || mode === "forgot-reset") && (
                  <button
                    type="button"
                    className="text-sm text-[#033f63] hover:text-[#28666e] hover:underline"
                    onClick={() => setMode("forgot-request")}
                  >
                    Reenviar código
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}