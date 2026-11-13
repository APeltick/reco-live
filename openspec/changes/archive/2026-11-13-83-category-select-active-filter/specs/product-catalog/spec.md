## MODIFIED Requirements

### Requirement: Filter by category

The page SHALL have a category select labelled `Category`, with the option `All categories` and one option per category from `GET /products/categories` (option text — the category `name`, value — its `slug`). Choosing a category SHALL load `GET /products/category/<slug>?limit=10&skip=0`; choosing `All categories` SHALL show the full list. If the categories cannot be loaded, the list SHALL still work. A category from the URL that is not among the loaded categories SHALL be an extra option, labelled with its slug and selected.

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
