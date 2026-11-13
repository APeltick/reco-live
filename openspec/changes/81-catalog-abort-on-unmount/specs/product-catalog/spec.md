## MODIFIED Requirements

### Requirement: Latest request wins

A response for an older search, category or page SHALL NOT replace the result of a newer one.

#### Scenario: Latest request wins

- **WHEN** the user searches `phone` and, before its response arrives, chooses the category `laptops`
- **THEN** only the products of `laptops` are shown, even if the response for `phone` arrives later

#### Scenario: Latest page wins

- **WHEN** the user chooses page 2 and, before its response arrives, chooses page 3
- **THEN** only the products of page 3 are shown with page 3 marked, even if the response for page 2 arrives later

#### Scenario: Leaving the catalog and coming back

- **WHEN** the user searches `phone`, leaves `/product` (for example, opens a product) before its response arrives, and comes back to `/product?category=laptops`
- **THEN** only the products of `laptops` are shown, even if the response for `phone` arrives later
