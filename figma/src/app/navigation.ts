export type AppView = "dashboard" | "orders" | "clients" | "balance" | "whatsapp";

const APP_NAVIGATE_EVENT = "apl:navigate";

export const requestAppNavigation = (view: AppView) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AppView>(APP_NAVIGATE_EVENT, { detail: view }));
};

export const addAppNavigationListener = (handler: (view: AppView) => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<AppView>;
    if (customEvent.detail) {
      handler(customEvent.detail);
    }
  };

  window.addEventListener(APP_NAVIGATE_EVENT, listener as EventListener);
  return () => window.removeEventListener(APP_NAVIGATE_EVENT, listener as EventListener);
};
