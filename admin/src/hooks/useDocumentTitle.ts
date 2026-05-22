import { useEffect } from 'react';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'Caxur-FS Admin';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [title]);
}
