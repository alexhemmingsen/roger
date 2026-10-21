import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

// Refetch when the user comes back to a screen. The first focus is skipped,
// because the query has just loaded.
export function useRefreshOnFocus(refetch: () => unknown) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}

// Pull-to-refresh with its own spinner, so background polling doesn't show one.
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }
  return { refreshing, onRefresh };
}
