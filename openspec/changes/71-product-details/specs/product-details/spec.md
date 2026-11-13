## ADDED Requirements

### Requirement: Product details page

The app SHALL have a page at `/products/:id`, inside the main layout. It SHALL load the product from the DummyJSON API with `GET /products/{id}` and accept the same product shape as the catalog list (a numeric `id`). A response of another shape SHALL be treated as a request error.

#### Scenario: Page loads a product

- **WHEN** the user opens `/products/1` and the API answers `GET /products/1` with a product
- **THEN** the page shows that product

#### Scenario: Response of another shape

- **WHEN** the API answers `GET /products/1` with `200` and a body that is not a product
- **THEN** the page shows the error alert, not product content

### Requirement: Product details content

The page SHALL show the product photo, its title as the page heading, its price and its description. The photo SHALL be the first of `images`, or `thumbnail` when `images` is empty, with the product title as its alternative text. The price SHALL be shown in US dollars with two decimals and the dollar sign (`9.99` → `$9.99`).

#### Scenario: Content is shown

- **WHEN** the product with title `Essence Mascara Lash Princess`, price `9.99`, an image and a description is loaded
- **THEN** the page shows the image with alt text `Essence Mascara Lash Princess`, the heading `Essence Mascara Lash Princess`, the price `$9.99` and the description

#### Scenario: Product without images

- **WHEN** the loaded product has an empty `images` list
- **THEN** the page shows its `thumbnail` as the photo

### Requirement: Catalog titles open the product page

Each product title in the catalog on `/product` SHALL be a link to `/products/<id>` of that product. It SHALL be a regular link: it can be focused with the keyboard and opened in a new tab.

#### Scenario: User opens a product from the catalog

- **WHEN** the user clicks a product title in the catalog
- **THEN** the details page of that product opens

### Requirement: Back link keeps the catalog filters

The page SHALL show a `Back to products` link. When the user came from the catalog, the link SHALL lead to `/product` with the same query parameters the catalog had (search, category and any other catalog state kept in the URL). When the page was opened in any other way (directly, in a new tab, from a shared link), the link SHALL lead to `/product`. It SHALL be a regular link reachable with the keyboard.

#### Scenario: Back to a filtered catalog

- **WHEN** the user is on `/product?category=laptops`, opens a product from the list and then clicks `Back to products`
- **THEN** `/product?category=laptops` opens with the category `laptops` selected and its products listed

#### Scenario: Back after a direct open

- **WHEN** the user opens `/products/1` directly and clicks `Back to products`
- **THEN** `/product` opens with no search and no category

### Requirement: Unknown product shows the not-found page

When the `id` in the URL is not a positive integer, the app SHALL show the existing not-found page without requesting the API. When the API answers `404` for the id, the app SHALL show the same not-found page. The not-found page itself SHALL NOT change.

#### Scenario: Id is not a number

- **WHEN** the user opens `/products/abc`
- **THEN** the not-found page is shown and no product request is sent

#### Scenario: Product does not exist

- **WHEN** the user opens `/products/9999` and the API answers `404`
- **THEN** the not-found page is shown

### Requirement: Loading indicator on the product page

While the product loads, the app SHALL show a loading indicator inside the main layout: on a direct open of the page, on a navigation to it from inside the app (the previous page may stay visible under the indicator), and on every retry.

#### Scenario: Loading on a direct open

- **WHEN** the user opens `/products/1` directly and the product response has not arrived yet
- **THEN** a loading indicator is shown inside the main layout, not a blank screen

#### Scenario: Loading after a click in the catalog

- **WHEN** the user clicks a product title in the catalog and the product response has not arrived yet
- **THEN** a loading indicator is shown until the details page replaces the catalog

### Requirement: Error state of the product page

A failed product request other than a `404` answer (no response, another non-2xx status, or a response of the wrong shape) SHALL show, inside the main layout, an MUI error alert with the text `Could not load the product.` (no technical details) and a `Try again` button that repeats the same request without reloading the app. The error SHALL be announced to screen readers as an alert.

#### Scenario: Request fails

- **WHEN** the product request fails with status 500
- **THEN** the page shows `Could not load the product.` and a `Try again` button inside the main layout

#### Scenario: User retries

- **WHEN** the request has failed and the user presses `Try again`, and the API now answers with the product
- **THEN** the loading indicator is shown, then the product content replaces the error
