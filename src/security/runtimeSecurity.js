/**
 * Orunei Runtime Security & Anti-Tampering Shield
 * Protege contra inspección trivial de código fuente, clickjacking y manipulación no autorizada.
 */

export function initRuntimeSecurity() {
  if (typeof window === 'undefined') return

  const isProd = Boolean(import.meta.env?.PROD)

  // 1. Mensaje de advertencia disuasorio en consola
  try {
    const bannerStyle = 'color: #a78bfa; font-size: 14px; font-weight: bold; background: #0f172a; padding: 10px 14px; border-radius: 8px; border: 1px solid #6d5cff;'
    console.log('%c🛡️ Orunei Security System — Acceso restringido. Cualquier intento de extracción o ingeniería inversa es monitorizado.', bannerStyle)
  } catch {}

  // Las siguientes protecciones se aplican en entornos de producción
  if (!isProd) return

  // 2. Prevención de Clickjacking en navegador
  try {
    if (window.top && window.top !== window.self) {
      // Si la app está incrustada en un frame no autorizado, romper el marco
      try {
        if (window.top.location.hostname !== window.location.hostname) {
          window.top.location.href = window.location.href
        }
      } catch {
        // Acceso cross-origin bloqueado por el navegador: romper frame
        window.top.location.href = window.location.href
      }
    }
  } catch {}

  // 3. Deshabilitar menú contextual (Click derecho) excepto en campos de texto editables
  window.addEventListener('contextmenu', (e) => {
    const target = e.target
    const isEditable = target instanceof HTMLElement && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    )
    if (!isEditable) {
      e.preventDefault()
    }
  }, { capture: true })

  // 4. Bloquear atajos de teclado para inspección de código
  window.addEventListener('keydown', (e) => {
    const isCtrlOrMeta = e.ctrlKey || e.metaKey
    const isShift = e.shiftKey
    const key = (e.key || '').toLowerCase()

    // F12 -> Herramientas de desarrollador
    if (e.key === 'F12') {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Ctrl+Shift+I / Cmd+Option+I -> Inspeccionar
    // Ctrl+Shift+J / Cmd+Option+J -> Consola
    // Ctrl+Shift+C / Cmd+Option+C -> Selector de elementos
    if (isCtrlOrMeta && isShift && ['i', 'j', 'c'].includes(key)) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Ctrl+U / Cmd+U -> Ver código fuente de la página
    if (isCtrlOrMeta && key === 'u') {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Ctrl+S / Cmd+S -> Guardar página web completa
    if (isCtrlOrMeta && key === 's') {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }, { capture: true })
}
