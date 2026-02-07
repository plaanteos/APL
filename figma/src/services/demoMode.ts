export const isDemoMode = (): boolean => {
  // Permitir cualquiera de las dos variables para comodidad
  const demo = (import.meta as any).env?.VITE_DEMO_MODE ?? (import.meta as any).env?.VITE_DEMO;
  return String(demo).toLowerCase() === 'true';
};
