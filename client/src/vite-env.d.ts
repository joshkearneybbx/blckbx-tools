/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_BIG_PURCHASE_WEBHOOK_URL?: string;
  readonly VITE_MEALCRAFT_IMPORT_WEBHOOK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  VITE_GOOGLE_MAPS_API_KEY?: string;
}
