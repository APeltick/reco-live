## RENAMED Requirements

- FROM: `### Requirement: First 10 products and the total found`
- TO: `### Requirement: Pages of 10 products and the total found`

## MODIFIED Requirements

### Requirement: Pages of 10 products and the total found

The list SHALL show the current result in pages of 10 products: page `p` SHALL be loaded with `limit=10&skip=(p − 1) × 10` on the endpoint of the current search, category or full list, and SHALL show the products of that page. The page SHALL show the total number of matching products as `N products found`, where N is `total` from the response. Below the list there SHALL be pagination controls with one page per 10 matching products (`ceil(total / 10)` pages), the current page marked. The controls SHALL be shown only when there is more than one page, or when the current page is past the last one, and SHALL NOT be shown while the list shows an error.

#### Scenario: Total is shown

- **WHEN** the API returns 10 products with `total: 194`
- **THEN** 10 product titles, `194 products found` and pagination controls with 20 pages, page 1 marked, are shown

#### Scenario: User opens the next page

- **WHEN** the user is on page 1 of the full list and chooses page 2 in the controls
- **THEN** the list is loaded with `GET /products?limit=10&skip=10` and shows those products, with page 2 marked

#### Scenario: Single page has no controls

- **WHEN** the category `laptops` returns 5 products with `total: 5`
- **THEN** the 5 titles and `5 products found` are shown and no pagination controls

## ADDED Requirements

### Requirement: Page number in the URL

The current page SHALL be kept in the query parameter `page`, counted from 1, next to `q` or `category`. Page 1 SHALL NOT be written to the URL. Opening a URL with `page=<n>` SHALL show page n of that search, category or full list, with the controls marking it.

#### Scenario: Link with a page

- **WHEN** the user opens `/product?category=smartphones&page=2`
- **THEN** the list is loaded with `GET /products/category/smartphones?limit=10&skip=10`, the category select shows `smartphones` and the controls mark page 2

#### Scenario: Page 1 is not in the URL

- **WHEN** the user is on `/product?page=3` and chooses page 1 in the controls
- **THEN** the URL becomes `/product` and the first page is shown

### Requirement: Page changes and history

Each page change SHALL add a browser history entry, so Back restores the previous page. A change of search or category SHALL remove `page`, so the new result starts at page 1. After a page change the view SHALL scroll to the top of the list.

#### Scenario: Back restores the previous page

- **WHEN** the user goes from page 1 to page 2 to page 3 and presses Back
- **THEN** the URL, the list and the controls show page 2

#### Scenario: New search starts at page 1

- **WHEN** the user is on `/product?page=4` and searches `phone`
- **THEN** the URL becomes `/product?q=phone` and the first page of the search result is shown

### Requirement: Invalid or out-of-range page in a link

A `page` value that is not a positive integer written in plain decimal (for example `0`, `-1`, `2.5`, `abc`, `02`) SHALL be treated as page 1 and removed from the URL without a new history entry. A `page` past the last page SHALL show `No products found` (the API returns no products for it) and SHALL keep the pagination controls, so the user can go to an existing page.

#### Scenario: Invalid page in a link

- **WHEN** the user opens `/product?q=phone&page=abc`
- **THEN** the URL becomes `/product?q=phone` without a new history entry and the first page of the search is shown

#### Scenario: Page past the last one

- **WHEN** the user opens `/product?page=99` and the full list has `total: 194`
- **THEN** `No products found` is shown together with the pagination controls of 20 pages
