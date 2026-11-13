# product-catalog Specification

## Purpose
The product list on `/product`: the source API (DummyJSON), what is shown (pages of 10 products, the total found and the pagination controls), search, the category filter, the search, category and page in the URL, the loading indicator, and the empty and error messages.

## Requirements

### Requirement: Products come from the DummyJSON API

The product list on `/product` SHALL be loaded from the DummyJSON API at `VITE_APP_API_URL` and accept its response shape: a collection `{ products, total, skip, limit }` where each product has a numeric `id`. A response that does not match this shape SHALL be treated as a request error.

#### Scenario: List loads from DummyJSON

- **WHEN** the user opens `/product` and the API answers `GET /products?limit=10&skip=0` with a DummyJSON collection
- **THEN** the titles of the returned products are shown, one per product

#### Scenario: Response of another shape

- **WHEN** the API answers with a body that is not a DummyJSON collection (for example json-server pagination with `data` and `pages`)
- **THEN** the error message is shown instead of the list

### Requirement: Pages of 10 products and the total found

The list SHALL show the current result in pages of 10 products: page `p` SHALL be loaded with `limit=10&skip=(p − 1) × 10` on the endpoint of the current search, category or full list. When the page has products, the list SHALL show them and the total number of matching products as `N products found`, where N is `total` from the response. A page with no products SHALL show `No products found` instead, with no total.

#### Scenario: Total is shown

- **WHEN** the user opens `/product` and the API returns 10 products with `total: 194`
- **THEN** 10 product titles, `194 products found` and pagination controls with 20 pages, page 1 marked, are shown

#### Scenario: User opens the next page

- **WHEN** the user is on page 1 of the full list and chooses page 2 in the controls
- **THEN** the list is loaded with `GET /products?limit=10&skip=10` and shows those products, with page 2 marked

### Requirement: Search products

The page SHALL have a search field labelled `Search products`. When the user stops typing for about 300 ms, the list SHALL be loaded from `GET /products/search?q=<text>&limit=10&skip=0` with the trimmed text; which products match is decided by the API (DummyJSON matches the title and other text fields). When no category is selected, an empty or whitespace-only search SHALL show the full list. Typing SHALL NOT send a request per keystroke.

#### Scenario: User searches

- **WHEN** the user types `phone` into `Search products` and stops typing
- **THEN** one request `GET /products/search?q=phone&limit=10&skip=0` is sent and its products and total are shown

#### Scenario: User clears the search

- **WHEN** no category is selected and the user clears the search field
- **THEN** the full list (`GET /products?limit=10&skip=0`) is shown

### Requirement: Filter by category

The page SHALL have a category select labelled `Category`: `All categories` and one option per category from `GET /products/categories` (text — `name`, value — `slug`). Choosing a category SHALL load `GET /products/category/<slug>?limit=10&skip=0`; `All categories` SHALL show the full list. If the categories cannot be loaded, the list SHALL still work. A category from the URL that is not among the loaded categories SHALL be an extra option, labelled with its slug and selected.

#### Scenario: User picks a category

- **WHEN** the user chooses `Smartphones` in `Category`
- **THEN** the products of `GET /products/category/smartphones?limit=10&skip=0` and their total are shown

#### Scenario: Categories cannot be loaded

- **WHEN** `GET /products/categories` fails and the URL has no category
- **THEN** `Category` offers only `All categories`, the full list is shown and search still works

#### Scenario: Categories cannot be loaded, category in the link

- **WHEN** the user opens `/product?category=laptops` and `GET /products/categories` fails
- **THEN** `Category` offers `All categories` and `laptops`, with `laptops` selected, and the products of `laptops` are shown

#### Scenario: Unknown category in the select

- **WHEN** the user opens `/product?category=nope` and the categories load without `nope`
- **THEN** `Category` shows `nope` selected, as an extra option next to the loaded categories, and `No products found` is shown

### Requirement: Search and category are mutually exclusive

At most one of search and category SHALL be active. Choosing a category SHALL clear the search field at once; a search SHALL reset the category to `All categories` when it is applied (after the typing pause).

#### Scenario: Category clears search

- **WHEN** the search `phone` is active and the user chooses the category `Laptops`
- **THEN** the search field is empty and the products of the category `laptops` are shown

#### Scenario: Search clears category

- **WHEN** the category `laptops` is active and the user types `mac` and stops typing
- **THEN** `Category` shows `All categories` and the search results for `mac` are shown

### Requirement: Search and category in the URL

The active search SHALL be kept in the query parameter `q`, the active category in `category`; never both. Opening `/product?q=<text>` or `/product?category=<slug>` SHALL show the same result as entering it on the page, with the field or select filled in. Each change of search or category SHALL add a browser history entry, so Back restores the previous state.

#### Scenario: Link with a search

- **WHEN** the user opens `/product?q=phone`
- **THEN** the search field shows `phone` and the search results for `phone` are shown

#### Scenario: Link with a category

- **WHEN** the user opens `/product?category=laptops`
- **THEN** `Category` shows `Laptops` and the products of `laptops` are shown

#### Scenario: Back restores the previous state

- **WHEN** the user searched `phone`, then chose the category `laptops`, then pressed Back
- **THEN** the URL is `/product?q=phone`, `Search products` shows `phone`, `Category` shows `All categories`, and the search results for `phone` are shown

### Requirement: Links with conflicting or unknown parameters

If both `q` and `category` are present in an opened URL, `category` SHALL win and `q` SHALL be removed from the URL without a new history entry. An unknown category slug SHALL show the empty result.

#### Scenario: Both parameters in a link

- **WHEN** the user opens `/product?q=phone&category=laptops`
- **THEN** the URL becomes `/product?category=laptops` without a new history entry, the search field is empty and the products of `laptops` are shown

#### Scenario: Unknown category in a link

- **WHEN** the user opens `/product?category=nope` and the API returns `{ products: [], total: 0 }`
- **THEN** `No products found` is shown

### Requirement: Empty and error messages

A result with no products SHALL show `No products found` (and no list). A failed request (network, non-2xx, or a response of the wrong shape) SHALL show an MUI error alert with the text `Could not load products.` (no technical details) and a `Try again` button that repeats the same request.

#### Scenario: Empty result

- **WHEN** the search `zzzz` returns `{ products: [], total: 0 }`
- **THEN** `No products found` is shown

#### Scenario: Request fails

- **WHEN** the products request fails
- **THEN** an error alert `Could not load products.` with `Try again` is shown; pressing it sends the same request again

### Requirement: Loading indicator

While the list is loading — on the first load and on every new search, category, page or retry — the page SHALL show a loading indicator.

#### Scenario: Loading on a new query

- **WHEN** the full list is shown and the user chooses the category `laptops`
- **THEN** a loading indicator is shown until the products of `laptops` arrive

#### Scenario: Loading on a page change

- **WHEN** the user is on page 1 and chooses page 2 in the controls
- **THEN** a loading indicator is shown until the products of page 2 arrive

### Requirement: Latest request wins

A response for an older search, category or page SHALL NOT replace the result of a newer one.

#### Scenario: Latest request wins

- **WHEN** the user searches `phone` and, before its response arrives, chooses the category `laptops`
- **THEN** only the products of `laptops` are shown, even if the response for `phone` arrives later

#### Scenario: Latest page wins

- **WHEN** the user chooses page 2 and, before its response arrives, chooses page 3
- **THEN** only the products of page 3 are shown with page 3 marked, even if the response for page 2 arrives later

### Requirement: Search and filter are accessible

The search field and the category select SHALL have visible labels bound to the controls and SHALL be fully usable with the keyboard (focus by Tab, type, open and choose a category with the keyboard). The total and the empty or error message SHALL be announced to screen readers when they change (a polite live region for the total and empty result; the error as an alert).

#### Scenario: Keyboard only

- **WHEN** the user tabs to `Search products`, types `phone`, tabs to `Category` and chooses `Laptops` with the arrow keys and Enter
- **THEN** the products of `laptops` are shown and the search field is empty

### Requirement: Pagination controls

Below the list there SHALL be pagination controls with one page per 10 matching products (`ceil(total / 10)` pages), the current page marked when it exists. They SHALL be shown only when there is more than one page, or when the current page is past the last one and there is at least one page. They SHALL NOT be shown while the list shows an error. They SHALL be in a navigation region labelled `Pagination` and usable with the keyboard alone.

#### Scenario: Single page has no controls

- **WHEN** the category `laptops` returns 5 products with `total: 5`
- **THEN** the 5 titles and `5 products found` are shown and no pagination controls

#### Scenario: No results and a page in the link

- **WHEN** the user opens `/product?category=nope&page=2` and the API returns `{ products: [], total: 0 }`
- **THEN** `No products found` is shown and no pagination controls

#### Scenario: Keyboard only

- **WHEN** the user tabs to the pagination controls and presses Enter on page 2
- **THEN** page 2 is loaded and marked

### Requirement: Page number in the URL

The current page SHALL be kept in the query parameter `page`, counted from 1, next to `q` or `category`. Page 1 SHALL NOT be written to the URL: an opened `page=1` SHALL be removed from it without a new history entry. Opening a URL with `page=<n>` SHALL show page n of that search, category or full list, with the controls marking it.

#### Scenario: Link with a page

- **WHEN** the user opens `/product?category=smartphones&page=2`
- **THEN** the list is loaded with `GET /products/category/smartphones?limit=10&skip=10`, `Category` shows `Smartphones` and the controls mark page 2

#### Scenario: Page 1 is not in the URL

- **WHEN** the user is on `/product?page=3` and chooses page 1 in the controls
- **THEN** the URL becomes `/product` and the first page is shown

#### Scenario: Page 1 in a link

- **WHEN** the user opens `/product?q=phone&page=1`
- **THEN** the URL becomes `/product?q=phone` without a new history entry and the first page of the search is shown

### Requirement: Page changes and history

Each page change SHALL add a browser history entry, so Back restores the previous page. A change of search or category SHALL remove `page`, so the new result starts at page 1. After a page is chosen in the controls, the view SHALL scroll to the top of the list.

#### Scenario: Back restores the previous page

- **WHEN** the user goes from page 1 to page 2 to page 3 and presses Back
- **THEN** the URL, the list and the controls show page 2

#### Scenario: New search starts at page 1

- **WHEN** the user is on `/product?page=4` and searches `phone`
- **THEN** the URL becomes `/product?q=phone` and the first page of the search result is shown

#### Scenario: View moves to the list

- **WHEN** the user has scrolled down to the controls below the list and chooses page 2
- **THEN** the view scrolls to the top of the list, and page 2 is shown there

### Requirement: Invalid or out-of-range page in a link

A `page` value that is not a positive integer written in plain decimal (for example `0`, `-1`, `2.5`, `abc`, `02`), or is above `Number.MAX_SAFE_INTEGER`, SHALL be treated as page 1 and removed from the URL without a new history entry. A `page` past the last page SHALL show `No products found` (the API returns no products for it) and, when there is at least one page, SHALL keep the pagination controls, so the user can go to an existing page.

#### Scenario: Invalid page in a link

- **WHEN** the user opens `/product?q=phone&page=abc`
- **THEN** the URL becomes `/product?q=phone` without a new history entry and the first page of the search is shown

#### Scenario: Page too large to be a number

- **WHEN** the user opens `/product?page=99999999999999999999`
- **THEN** the URL becomes `/product` without a new history entry and the first page is shown

#### Scenario: Search, category and page in a link

- **WHEN** the user opens `/product?q=phone&category=smartphones&page=2`
- **THEN** the URL becomes `/product?category=smartphones&page=2` in one rewrite without a new history entry, the search field is empty and page 2 of `smartphones` is shown

#### Scenario: Page past the last one

- **WHEN** the user opens `/product?page=99` and the full list has `total: 194`
- **THEN** `No products found` is shown, with no total, together with the pagination controls of 20 pages and no page marked
