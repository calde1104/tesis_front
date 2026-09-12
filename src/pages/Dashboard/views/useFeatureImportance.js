import { useState, useEffect, useCallback } from 'react';
import { getFeatureImportance } from '../../../services/forecast';

/**
 * Carga la explicabilidad del modelo Champion una sola vez.
 *
 * Vive fuera del modal porque la vista necesita el `modeloTipo` para rotular la
 * píldora de la leyenda del gráfico antes de que el usuario abra el modal.
 */
export const useFeatureImportance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getFeatureImportance());
    } catch (err) {
      console.warn('getFeatureImportance falló:', err);
      setData(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { data, loading, error, reload };
};
