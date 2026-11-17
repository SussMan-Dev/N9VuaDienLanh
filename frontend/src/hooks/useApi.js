import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useApi — generic data-fetching hook.
 *
 * @param {Function} fetchFn  - async function returning { data, error }
 * @param {Array}    deps     - dependency array; re-fetches when deps change
 * @returns {{ data, isLoading, error, refetch }}
 *
 * @example
 * const { data, isLoading, error, refetch } = useApi(() => getRepairOrders(), []);
 */
export function useApi(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use ref to avoid stale closure on unmount
  const isMountedRef = useRef(true);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchFn();

    if (!isMountedRef.current) return;

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
      setError(null);
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    isMountedRef.current = true;
    execute();
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute]);

  return { data, isLoading, error, refetch: execute };
}
