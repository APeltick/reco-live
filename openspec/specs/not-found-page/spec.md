# not-found-page Specification

## Purpose
Defines the page a user sees when the requested URL matches no route of the app, and how they get back to the app from it.

## Requirements

### Requirement: Unknown URL shows the not-found page

When the requested URL matches no route, the app SHALL render the not-found page instead of any route content. The page SHALL be shown on its own, without the main application layout, with its content centered on the screen.

#### Scenario: User opens an unknown URL

- **WHEN** the user opens `/nope` (a path that matches no route)
- **THEN** the not-found page is shown, centered on the screen, without the main application layout

#### Scenario: Known routes are not affected

- **WHEN** the user opens `/` or `/product`
- **THEN** the corresponding page is shown as before, not the not-found page

### Requirement: Not-found page content

The not-found page SHALL show, in English:
- a page heading `Page not found`, as the top-level heading of the page;
- one short sentence explaining that the requested page does not exist or has been moved: `The page you are looking for doesn't exist or has been moved.`;
- a link `Go to home`.

#### Scenario: Page content is shown

- **WHEN** the not-found page is shown
- **THEN** the user sees the heading `Page not found`, the explanation sentence and the `Go to home` link, and the heading is the page's top-level heading

### Requirement: Link back to the home page

The `Go to home` link SHALL lead to the dashboard route (`/`) and SHALL be a regular link (it can be focused with the keyboard and opened in a new tab). Following it SHALL navigate inside the app without a full page reload.

#### Scenario: User follows the link

- **WHEN** the user on the not-found page clicks `Go to home`
- **THEN** the dashboard page at `/` is shown, without a full page reload

#### Scenario: Link is keyboard-accessible

- **WHEN** the user presses Tab on the not-found page and then Enter on the focused `Go to home` link
- **THEN** the dashboard page at `/` is shown
