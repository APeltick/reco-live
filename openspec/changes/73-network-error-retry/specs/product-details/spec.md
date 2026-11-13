## MODIFIED Requirements

### Requirement: Loading and error states of the product page

While the product loads, the app SHALL show a loading indicator inside the main layout: on a direct open of the page, on a navigation to it from inside the app (the previous page may stay visible under the indicator), and on every retry. Any failed request other than a `404` answer (which shows the not-found page) SHALL show, inside the main layout, an MUI error alert with no technical details and a `Try again` button that repeats the same request without reloading the app. When the request got no response at all (offline, DNS failure, unreachable host, a request blocked before a response), the alert text SHALL be `No connection to the server. Check your internet connection and try again.` For any other failure (a non-2xx status other than 404, or a response of the wrong shape) the alert text SHALL be `Could not load the product.` The error SHALL be announced to screen readers as an alert.

#### Scenario: Loading on a direct open

- **WHEN** the user opens `/products/1` directly and the product response has not arrived yet
- **THEN** a loading indicator is shown inside the main layout, not a blank screen

#### Scenario: Loading after a click in the catalog

- **WHEN** the user clicks a product title in the catalog and the product response has not arrived yet
- **THEN** a loading indicator is shown until the details page replaces the catalog

#### Scenario: Request fails

- **WHEN** the product request fails with status 500
- **THEN** the page shows `Could not load the product.` and a `Try again` button inside the main layout

#### Scenario: No connection

- **WHEN** the product request gets no response because the network is unavailable
- **THEN** the page shows `No connection to the server. Check your internet connection and try again.` and a `Try again` button inside the main layout

#### Scenario: User retries

- **WHEN** the request has failed and the user presses `Try again`, and the API now answers with the product
- **THEN** the loading indicator is shown, then the product content replaces the error
