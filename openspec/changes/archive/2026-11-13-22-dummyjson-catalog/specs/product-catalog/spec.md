## ADDED Requirements

### Requirement: Products come from the DummyJSON API

The product list on `/product` SHALL be loaded from the DummyJSON API at `VITE_APP_API_URL` and accept its response shape: a collection `{ products, total, skip, limit }` where each product has a numeric `id`. A response that does not match this shape SHALL be treated as a request error.

#### Scenario: List loads from DummyJSON

- **WHEN** the user opens `/product` and the API answers `GET /products?limit=10&skip=0` with a DummyJSON collection
- **THEN** the titles of the returned products are shown, one per product

#### Scenario: Response of another shape

- **WHEN** the API answers with a body that is not a DummyJSON collection (for example json-server pagination with `data` and `pages`)
- **THEN** the error message is shown instead of the list

### Requirement: First 10 products and the total found

The list SHALL show at most the first 10 products of the current result and the total number of matching products as `N products found`, where N is `total` from the response. There SHALL be no pagination controls.

#### Scenario: Total is shown

- **WHEN** the API returns 10 products with `total: 194`
- **THEN** 10 product titles and `194 products found` are shown

### Requirement: Search products

The page SHALL have a search field labelled `Search products`. When the user stops typing for about 300 ms, the list SHALL be loaded from `GET /products/search?q=<text>&limit=10&skip=0` with the trimmed text; which products match is decided by the API (DummyJSON matches the title and other text fields). When no category is selected, an empty or whitespace-only search SHALL show the full list. Typing SHALL NOT send a request per keystroke.

#### Scenario: User searches

- **WHEN** the user types `phone` into `Search products` and stops typing
- **THEN** one request `GET /products/search?q=phone&limit=10&skip=0` is sent and its products and total are shown

#### Scenario: User clears the search

- **WHEN** no category is selected and the user clears the search field
- **THEN** the full list (`GET /products?limit=10&skip=0`) is shown

### Requirement: Filter by category

The page SHALL have a category select labelled `Category`, with the option `All categories` and one option per category from `GET /products/categories` (option text — the category `name`, value — its `slug`). Choosing a category SHALL load `GET /products/category/<slug>?limit=10&skip=0`; choosing `All categories` SHALL show the full list. If the categories cannot be loaded, the select SHALL offer only `All categories` and the list SHALL still work.

#### Scenario: User picks a category

- **WHEN** the user chooses `Smartphones` in `Category`
- **THEN** the products of `GET /products/category/smartphones?limit=10&skip=0` and their total are shown

#### Scenario: Categories cannot be loaded

- **WHEN** `GET /products/categories` fails
- **THEN** `Category` offers only `All categories`, the full list is shown and search still works

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

While the list is loading — on the first load and on every new search, category or retry — the page SHALL show a loading indicator.

#### Scenario: Loading on a new query

- **WHEN** the full list is shown and the user chooses the category `laptops`
- **THEN** a loading indicator is shown until the products of `laptops` arrive

### Requirement: Latest request wins

A response for an older search or category SHALL NOT replace the result of a newer one.

#### Scenario: Latest request wins

- **WHEN** the user searches `phone` and, before its response arrives, chooses the category `laptops`
- **THEN** only the products of `laptops` are shown, even if the response for `phone` arrives later

### Requirement: Search and filter are accessible

The search field and the category select SHALL have visible labels bound to the controls and SHALL be fully usable with the keyboard (focus by Tab, type, open and choose a category with the keyboard). The total and the empty or error message SHALL be announced to screen readers when they change (a polite live region for the total and empty result; the error as an alert).

#### Scenario: Keyboard only

- **WHEN** the user tabs to `Search products`, types `phone`, tabs to `Category` and chooses `Laptops` with the arrow keys and Enter
- **THEN** the products of `laptops` are shown and the search field is empty
