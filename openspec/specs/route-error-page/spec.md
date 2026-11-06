# route-error-page Specification

## Purpose
What the user sees when a route fails with anything other than 404, and how they recover.

## Requirements

### Requirement: Route errors other than 404 show the error page

When rendering a route fails with any error other than a 404 route response — an error response with another status, an exception thrown by a loader or while rendering, a failed load of a lazy page — the app SHALL render the error page instead of an empty screen. The page SHALL be shown on its own, without the main application layout, with its content centered on the screen. A 404 route response SHALL keep showing the not-found page.

#### Scenario: A route fails with a server error

- **WHEN** a route's loader throws a response with status 500
- **THEN** the error page is shown, centered on the screen, without the main application layout

#### Scenario: A page throws while rendering

- **WHEN** a page component throws an exception while rendering
- **THEN** the error page is shown instead of an empty screen

#### Scenario: Unknown URL still shows the not-found page

- **WHEN** the user opens `/nope` (a path that matches no route)
- **THEN** the not-found page is shown, not the error page

### Requirement: Error page content

The error page SHALL show, in English:
- a page heading `Something went wrong`, as the top-level heading of the page;
- one sentence: `An unexpected error occurred. Please try again or go back to the home page.`;
- a `Try again` button;
- a `Go to home` link.

The page SHALL NOT show the error status code, the error message or any other error details.

#### Scenario: Page content is shown

- **WHEN** the error page is shown
- **THEN** the user sees the heading `Something went wrong`, the explanation sentence, the `Try again` button and the `Go to home` link, and the heading is the page's top-level heading

#### Scenario: Error details are hidden

- **WHEN** the error page is shown for a response with status 500 and status text `Internal Server Error`
- **THEN** neither `500` nor `Internal Server Error` appears on the page

### Requirement: Error is logged for developers

When the error page is shown, the app SHALL write the original error to the browser console with `console.error`.

#### Scenario: Error goes to the console

- **WHEN** the error page is shown for an exception `Error("boom")`
- **THEN** the browser console has an error entry containing `boom`

### Requirement: Ways out of the error page

The `Try again` button SHALL reload the current page (a full page reload of the same URL). The `Go to home` link SHALL lead to the dashboard route (`/`) and SHALL be a regular link (it can be focused with the keyboard and opened in a new tab). Both SHALL be reachable with the keyboard.

#### Scenario: User tries again

- **WHEN** the user on the error page at `/product` clicks `Try again`
- **THEN** the browser reloads `/product`

#### Scenario: User goes home

- **WHEN** the user on the error page clicks `Go to home`
- **THEN** the dashboard page at `/` is shown

#### Scenario: Keyboard access

- **WHEN** the user presses Tab on the error page
- **THEN** focus moves to `Try again` and then to `Go to home`, and Enter activates the focused control
