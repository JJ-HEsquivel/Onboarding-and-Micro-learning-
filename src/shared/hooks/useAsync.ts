import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/**
 * Ejecuta una función asíncrona (ej. leer de Dataverse) y expone su estado.
 *
 * IMPORTANTE: `loader` debe ser estable (una función declarada fuera del componente
 * o envuelta en useCallback); si cambia en cada render, se volvería a ejecutar sin fin.
 *
 * @example
 * const { data, loading, error, reload } = useAsync(loadCollaboratorsOverview);
 */
export function useAsync<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: undefined, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    loader().then(
      (data) => active && setState({ data, error: undefined, loading: false }),
      (error: unknown) =>
        active &&
        setState((prev) => ({
          data: prev.data,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
        })),
    );
    // Si el componente se desmonta antes de terminar, se ignora el resultado.
    return () => {
      active = false;
    };
  }, [loader, version]);

  /** Vuelve a cargar los datos conservando los actuales mientras tanto. */
  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, error: undefined, loading: true }));
    setVersion((value) => value + 1);
  }, []);

  return { ...state, reload };
}
