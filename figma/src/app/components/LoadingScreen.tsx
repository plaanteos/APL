import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#033f63] text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="bg-white p-6 rounded-2xl shadow-2xl mb-8 inline-block">
          <img
            src="/apl-logo.png"
            alt="APL Dental Logo"
            className="h-16 w-auto"
          />
        </div>

        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute animate-ping h-16 w-16 rounded-full bg-[#7c9885]/30"></div>
          <Loader2 className="animate-spin h-10 w-10 text-[#fedc97]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">APL Dental</h1>
        <p className="text-[#7c9885] font-medium animate-pulse">Iniciando sesión...</p>
        
        <div className="mt-8 flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                    }}
                    className="w-2 h-2 rounded-full bg-[#fedc97]"
                />
            ))}
        </div>
      </motion.div>
    </div>
  );
}
