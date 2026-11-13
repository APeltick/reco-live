import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  generatePath,
  Link as RouterLink,
  useLocation,
  useSearchParams,
} from "react-router";
import {
  type Categories,
  getCategories,
  getQueryCategorySlug,
  getQuerySearchText,
  pageToPaging,
  parseProductsSearchParams,
  productsQueryToSearchParams,
  shouldShowPagination,
  useDebouncedValue,
  useFetchProducts,
} from "~features/products";
import { ROUTES_CONSTANTS } from "~shared/config/routes";

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;
const T_T_DEV = {
  allCategories: "All categories",
  categoryLabel: "Category",
  loading: "Loading products",
  pagination: "Pagination",
  noProducts: "No products found",
  retry: "Try again",
  searchLabel: "Search products",
  loadError: "Could not load products.",
} as const;

export function ProductPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const {
    needsReplace,
    page,
    query,
  } = parseProductsSearchParams(searchParams);
  const urlSearchText = getQuerySearchText(query);
  const categorySlug = getQueryCategorySlug(query);

  const [searchText, setSearchText] = useState(urlSearchText);
  const [syncedUrlSearchText, setSyncedUrlSearchText] = useState(urlSearchText);
  const categories = useCategories();

  // The field follows the URL (link, Back/Forward, category choice).
  if (urlSearchText !== syncedUrlSearchText) {
    setSyncedUrlSearchText(urlSearchText);
    if (searchText.trim() !== urlSearchText) {
      setSearchText(urlSearchText);
    }
  }

  // A non-canonical opened link (both `q` and `category`, an invalid `page` or `page=1`):
  // rewritten once, without a history entry.
  useEffect(() => {
    if (needsReplace) {
      setSearchParams(productsQueryToSearchParams(query, page), { replace: true });
    }
  }, [needsReplace, page, query, setSearchParams]);

  // Apply the typed text after the pause, only when it differs from the URL's `q`.
  // A programmatic clear after a category choice ("" equals the new `q`) is skipped.
  useDebouncedValue(
    searchText.trim(),
    SEARCH_DEBOUNCE_MS,
    (text) => text === urlSearchText,
    (text) => {
      setSearchParams(
        productsQueryToSearchParams(text === ""
          ? { kind: "all" }
          : {
              kind: "search",
              q: text,
            }),
      );
    },
  );

  const {
    collection,
    isError,
    isFetching,
    refetch,
  } = useFetchProducts(query, pageToPaging(page));
  const listReference = useRef<HTMLDivElement>(null);
  const pageCount = collection === null ? 0 : Math.ceil(collection.total / PAGE_SIZE);
  const isShowPagination = shouldShowPagination({
    count: pageCount,
    page,
    hasError: isError,
  });

  function handlePageChange(nextPage: number) {
    setSearchParams(productsQueryToSearchParams(query, nextPage));
    listReference.current?.scrollIntoView({ block: "start" });
  }

  function handleCategoryChange(slug: string) {
    setSearchText("");
    setSearchParams(
      productsQueryToSearchParams(slug === ""
        ? { kind: "all" }
        : {
            kind: "category",
            slug,
          }),
    );
  }

  const hasUnlistedCategory = categorySlug !== ""
    && categories.every((category) => category.slug !== categorySlug);

  return (
    <Stack spacing={2}>
      <TextField
        label={T_T_DEV.searchLabel}
        onChange={(event) => {
          setSearchText(event.target.value);
        }}
        type="search"
        value={searchText}
      />
      <TextField
        label={T_T_DEV.categoryLabel}
        onChange={(event) => {
          handleCategoryChange(event.target.value);
        }}
        select
        slotProps={{
          inputLabel: { shrink: true },
          select: { displayEmpty: true },
        }}
        value={categorySlug}
      >
        <MenuItem value="">{T_T_DEV.allCategories}</MenuItem>
        {hasUnlistedCategory && (
          <MenuItem value={categorySlug}>{categorySlug}</MenuItem>
        )}
        {categories.map((category) => (
          <MenuItem key={category.slug} value={category.slug}>
            {category.name}
          </MenuItem>
        ))}
      </TextField>
      {isFetching && (
        <LinearProgress
          aria-label={T_T_DEV.loading}
          data-testid="products-loader"
        />
      )}
      {isError && (
        <Alert
          action={(
            <Button color="inherit" onClick={refetch} size="small">
              {T_T_DEV.retry}
            </Button>
          )}
          severity="error"
        >
          {T_T_DEV.loadError}
        </Alert>
      )}
      <Box ref={listReference}>
        <Typography
          aria-live="polite"
          data-testid="products-status"
          role="status"
        >
          {!isError && collection !== null && (collection.products.length === 0
            ? T_T_DEV.noProducts
            : `${String(collection.total)} products found`)}
        </Typography>
        {!isError && collection?.products.map((product) => (
          <p key={product.id}>
            <Box
              component={RouterLink}
              state={{ from: location.search }}
              sx={{ color: "primary.main" }}
              to={generatePath(ROUTES_CONSTANTS.productDetails, { id: String(product.id) })}
            >
              {product.title}
            </Box>
          </p>
        ))}
      </Box>
      {isShowPagination && (
        <Box aria-label={T_T_DEV.pagination} component="nav">
          <Pagination
            count={pageCount}
            onChange={(_event, nextPage) => {
              handlePageChange(nextPage);
            }}
            page={page}
          />
        </Box>
      )}
    </Stack>
  );
}

function useCategories(): Categories {
  const [categories, setCategories] = useState<Categories>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setCategories(await getCategories(controller.signal));
      } catch {
        // categories are optional: on failure only `All categories` is offered
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, []);

  return categories;
}
