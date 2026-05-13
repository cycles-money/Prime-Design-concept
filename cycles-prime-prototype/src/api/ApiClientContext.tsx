// React context that supplies the ApiClient to the whole app.
//
// Components consume the client via `useApiClient()` and run queries via
// the small `useApiQuery` helper, which gives loading/error/data state
// without pulling in a query library. If/when a real query layer becomes
// useful (caching, refetch-on-focus, optimistic updates), swap this
// helper out — the consumer API of `useApiQuery({ data, error, loading })`
// is compatible with the common patterns in TanStack Query and SWR.
//
// To swap in the real client (e.g. in prime-web-2):
//   1. Replace `new MockApiClient()` with `new ApiClient(...)`.
//   2. Wrap with an AuthProvider that calls `client.setToken(jwt)`.
//   3. Everything else is identical.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MockApiClient } from './mockClient';
import type { ApiClient } from './client';
import { ApiError } from './client';

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({
  children,
  client,
}: {
  children: ReactNode;
  /** Override the default client (useful for tests / Storybook). */
  client?: ApiClient;
}) {
  // Hold the client in a ref so it isn't recreated on re-render.
  const defaultClient = useRef<ApiClient | null>(null);
  if (defaultClient.current === null && !client) {
    defaultClient.current = new MockApiClient();
  }
  const value = client ?? defaultClient.current!;
  return <ApiClientContext.Provider value={value}>{children}</ApiClientContext.Provider>;
}

/** Get the ApiClient. Throws if used outside ApiClientProvider. */
export function useApiClient(): ApiClient {
  const c = useContext(ApiClientContext);
  if (!c) throw new Error('useApiClient must be used inside <ApiClientProvider>');
  return c;
}

// ── useApiQuery ───────────────────────────────────────────────────────────
//
// Minimal data-fetching hook. Calls the provided fetcher on mount and any
// time the `deps` array changes. Returns `{ data, error, loading, refetch }`.
// Stale data remains visible while a refetch is in flight (no flicker).

export interface UseApiQueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  /** Re-run the fetcher. Returns the new result. */
  refetch: () => Promise<T | undefined>;
}

export function useApiQuery<T>(
  fetcher: (client: ApiClient) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): UseApiQueryResult<T> {
  const client = useApiClient();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Track the latest call so out-of-order responses don't overwrite newer
  // data with older results.
  const callIdRef = useRef(0);

  const run = useCallback(async (): Promise<T | undefined> => {
    const myCall = ++callIdRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await fetcher(client);
      if (callIdRef.current === myCall) {
        setData(result);
        setLoading(false);
      }
      return result;
    } catch (e) {
      if (callIdRef.current === myCall) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      }
      return undefined;
    }
    // fetcher is intentionally not a dep — the caller controls invalidation
    // via the `deps` array. This matches TanStack Query's `queryKey` model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, ...deps]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return { data, error, loading, refetch: run };
}

/** Type guard: was the error an ApiError with a known status code? */
export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
