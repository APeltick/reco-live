## MODIFIED Requirements

### Requirement: Empty and error messages

A result with no products SHALL show `No products found` (and no list). A failed request SHALL show an MUI error alert, with no technical details, and a `Try again` button that repeats the same request. When the request got no response at all (offline, DNS failure, unreachable host, a request blocked before a response), the alert text SHALL be `No connection to the server. Check your internet connection and try again.` For any other failure (a non-2xx status or a response of the wrong shape) the alert text SHALL be `Could not load products.` A cancelled request (replaced by a newer one) SHALL NOT show an error.

#### Scenario: Empty result

- **WHEN** the search `zzzz` returns `{ products: [], total: 0 }`
- **THEN** `No products found` is shown

#### Scenario: Request fails

- **WHEN** the products request fails with status 500
- **THEN** an error alert `Could not load products.` with `Try again` is shown; pressing it sends the same request again

#### Scenario: No connection

- **WHEN** the products request gets no response because the network is unavailable
- **THEN** an error alert `No connection to the server. Check your internet connection and try again.` with `Try again` is shown

#### Scenario: Retry after the connection is back

- **WHEN** the network error is shown, the network is available again and the user presses `Try again`
- **THEN** the same request is sent again and its result replaces the error
