/**
 * Resolución del tema (claro / oscuro / automático) en lógica pura, sin
 * dependencias de React ni del DOM más allá de aplicar clases.
 *
 * La preferencia se guarda por dispositivo (localStorage), no en el perfil
 * de usuario: cambiar de tema es una decisión sobre la pantalla que se está
 * mirando ahora mismo (luz de la sala, brillo, hora del día), no un rasgo de
 * la cuenta que deba viajar entre dispositivos ni compartirse entre quienes
 * usan el mismo perfil en distintas máquinas.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

/** Clave de almacenamiento. La Tarea 2 la repite igual en un script inline
 * que no puede importar este módulo: si cambia aquí, cambia también allí. */
export const THEME_STORAGE_KEY = 'gramola:theme';

/** El tema efectivo, ya resuelto: lo que decide si `<html>` lleva `.dark`. */
export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): 'light' | 'dark' {
  if (pref === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return pref;
}

/**
 * Lee la preferencia guardada. Cualquier valor desconocido cae en 'system':
 * puede venir de una versión anterior, de otra app que comparta dominio o de
 * alguien tocando el almacenamiento a mano, y ninguno de esos casos puede
 * dejar la aplicación sin tema. También se tolera que el almacenamiento
 * lance (Safari en modo privado, por ejemplo, puede bloquear localStorage).
 */
export function readStoredPreference(storage?: Pick<Storage, 'getItem'>): ThemePreference {
  const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  if (!store) {
    return 'system';
  }

  let valor: string | null;
  try {
    valor = store.getItem(THEME_STORAGE_KEY);
  } catch {
    return 'system';
  }

  if (valor === 'light' || valor === 'dark' || valor === 'system') {
    return valor;
  }
  return 'system';
}

/**
 * Aplica el tema al documento: clase `dark` en `<html>` y `color-scheme`
 * para que los controles nativos (scrollbars, inputs) también cambien. No
 * toca el resto de clases de `<html>`, donde viven las variables de las
 * fuentes.
 */
export function applyTheme(theme: 'light' | 'dark', root?: HTMLElement): void {
  const elemento = root ?? document.documentElement;
  elemento.classList.toggle('dark', theme === 'dark');
  elemento.style.colorScheme = theme;
}
