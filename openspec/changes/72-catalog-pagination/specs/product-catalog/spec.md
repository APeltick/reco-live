## RENAMED Requirements

- FROM: `### Requirement: First 10 products and the total found`
- TO: `### Requirement: Pages of 10 products and the total found`

## MODIFIED Requirements

### Requirement: Pages of 10 products and the total found

The list SHALL show the current result in pages of 10 products: page `p` SHALL be loaded with `limit=10&skip=(p − 1) × 10` on the endpoint of the current search, category or full list. When the page has products, the list SHALL show them and the total number of matching products as `N products found`, where N is `total` from the response. A page with no products SHALL show `No products found` instead, with no total.

#### Scenario: Total is shown

- **WHEN** the API returns 10 products with `total: 194`
- **THEN** 10 product titles, `194 products found` and pagination controls with 20 pages, page 1 marked, are shown

#### Scenario: User opens the next page

- **WHEN** the user is on page 1 of the full list and chooses page 2 in the controls
- **THEN** the list is loaded with `GET /products?limit=10&skip=10` and shows those products, with page 2 marked

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

## ADDED Requirements

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
- **THEN** the list is loaded with `GET /products/category/smartphones?limit=10&skip=10`, the category select shows `smartphones` and the controls mark page 2

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

A `page` value that is not a positive integer written in plain decimal (for example `0`, `-1`, `2.5`, `abc`, `02`) SHALL be treated as page 1 and removed from the URL without a new history entry. A `page` past the last page SHALL show `No products found` (the API returns no products for it) and SHALL keep the pagination controls, so the user can go to an existing page.

#### Scenario: Invalid page in a link

- **WHEN** the user opens `/product?q=phone&page=abc`
- **THEN** the URL becomes `/product?q=phone` without a new history entry and the first page of the search is shown

#### Scenario: Page past the last one

- **WHEN** the user opens `/product?page=99` and the full list has `total: 194`
- **THEN** `No products found` is shown, with no total, together with the pagination controls of 20 pages and no page marked
