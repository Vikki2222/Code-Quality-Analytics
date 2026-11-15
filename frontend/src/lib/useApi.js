import { useCallback, useEffect, useState } from 'react';

/**
 * Fetch data for a component: { data, error, loading, reload }.
 *
 * `deps` identifies the request (like useEffect deps). Results are tagged
 * with the deps they were fetched for, so after navigating (new deps) the
 * component gets `data: null` instead of the previous page's data, and a
 * late response for old deps is ignored. `reload()` refetches the same
 * request while keeping the current data visible (no flash to empty).
 */
export function useApi(fetcher, deps) {
  const [nonce, setNonce] = useState(0);
  const depsKey = JSON.stringify(deps);
  const key = `${depsKey}#${nonce}`;
  const [state, setState] = useState({ key: null, depsKey: null, data: null, error: null });

  useEffect(() => {
    let active = true;
    fetcher().then(
      (data) => active && setState({ key, depsKey, data, error: null }),
      (error) => active && setState((prev) => ({ key, depsKey, data: prev.depsKey === depsKey ? prev.data : null, error }))
    );
    return () => {
      active = false;
    };
    // `key` encodes deps + nonce; fetcher is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return {
    data: state.depsKey === depsKey ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: state.key !== key,
    reload,
  };
}
