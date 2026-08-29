import { apiRequest, getEmpresaId } from './api';

/**
 * Consulta la lista paginada de notificaciones/alertas de la empresa.
 * @param {number} page Número de página (0-indexed)
 * @param {number} size Cantidad de elementos por página (default 20)
 * @returns {Promise<{content: Array, totalElements: number, totalPages: number, page: number, size: number}>}
 */
export const getNotificaciones = async (page = 0, size = 20) => {
  const empresaId = getEmpresaId();
  try {
    const data = await apiRequest(`/v1/${empresaId}/notificaciones?page=${page}&size=${size}&sort=fechaGeneracion,desc`);
    return data || { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 };
  } catch (error) {
    console.warn('Error al obtener notificaciones del backend:', error);
    return { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 };
  }
};

/**
 * Marca una notificación como VISTA (el usuario la abrió/leyó).
 * @param {string} notifId UUID de la notificación
 * @returns {Promise<Object>} Notificación actualizada
 */
export const marcarNotificacionVista = async (notifId) => {
  if (!notifId) return null;
  const empresaId = getEmpresaId();
  try {
    const res = await apiRequest(`/v1/${empresaId}/notificaciones/${notifId}/vista`, {
      method: 'PATCH'
    });
    return res;
  } catch (error) {
    console.warn(`Error al marcar notificación ${notifId} como vista:`, error);
    return null;
  }
};

/**
 * Marca una notificación como RESUELTA (el usuario cerró la alerta).
 * @param {string} notifId UUID de la notificación
 * @returns {Promise<Object>} Notificación actualizada
 */
export const marcarNotificacionResuelta = async (notifId) => {
  if (!notifId) return null;
  const empresaId = getEmpresaId();
  try {
    const res = await apiRequest(`/v1/${empresaId}/notificaciones/${notifId}/resuelta`, {
      method: 'PATCH'
    });
    return res;
  } catch (error) {
    console.warn(`Error al marcar notificación ${notifId} como resuelta:`, error);
    return null;
  }
};
