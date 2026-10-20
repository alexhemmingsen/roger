// Stands in for the Supabase client in unit tests. It records every query builder call and answers
// each from() with the next queued response, so tests can check the exact query a service builds.

type Call = [method: string, ...args: unknown[]];
type FakeResponse = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
};

export type RecordedQuery = { table: string; calls: Call[] };

function createFakeSupabase() {
  const queries: RecordedQuery[] = [];
  const responses: FakeResponse[] = [];

  function from(table: string): object {
    const query: RecordedQuery = { table, calls: [] };
    queries.push(query);
    const response = responses.shift() ?? {};
    const result = {
      data: response.data ?? null,
      error: response.error ?? null,
    };

    const builder: object = new Proxy(
      {},
      {
        get(_target, prop) {
          if (typeof prop === "symbol") return undefined;
          if (prop === "then") {
            // Awaiting the builder runs the query. Like the real client, throwOnError() turns an error into a rejection.
            return (
              onFulfilled?: (value: unknown) => unknown,
              onRejected?: (reason: unknown) => unknown,
            ) => {
              const throws = query.calls.some(
                ([method]) => method === "throwOnError",
              );
              const settled =
                throws && result.error
                  ? Promise.reject(result.error)
                  : Promise.resolve(result);
              return settled.then(onFulfilled, onRejected);
            };
          }
          return (...args: unknown[]) => {
            query.calls.push([prop, ...args]);
            return builder;
          };
        },
      },
    );
    return builder;
  }

  return {
    client: { from },
    queries,
    /** Queues responses for the next from() calls, in order. A from() with nothing queued gets { data: null, error: null }. */
    respond(...next: FakeResponse[]) {
      responses.push(...next);
    },
    reset() {
      queries.length = 0;
      responses.length = 0;
    },
  };
}

export const fakeSupabase = createFakeSupabase();
