import {
  useCallback,
  useEffect,
  useState,
} from "react";

export type FetchFunction<Data> = () => Promise<Data>;

export interface FetchState {
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => void;
}

export function useFetch<Data>(
  fetchFunction: FetchFunction<Data>,
): FetchState {
  const [error, setError] = useState<unknown>();
  const [requestNumber, setRequestNumber] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(() => {
    setRequestNumber((currentRequestNumber) => currentRequestNumber + 1);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function fetchData() {
      setError(undefined);
      setIsFetching(true);

      try {
        await fetchFunction();
      } catch (error_) {
        if (isActive) {
          setError(error_);
        }
      } finally {
        if (isActive) {
          setIsFetching(false);
          setIsLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      isActive = false;
    };
  }, [fetchFunction, requestNumber]);

  return {
    error,
    isError: error !== undefined,
    isFetching,
    isLoading,
    refetch,
  };
}
