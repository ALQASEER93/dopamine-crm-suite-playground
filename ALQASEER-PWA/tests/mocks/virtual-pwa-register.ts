type RegisterSWOptions = {
  immediate?: boolean;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
};

export function registerSW(_options: RegisterSWOptions = {}) {
  return async (_reload?: boolean) => {};
}
