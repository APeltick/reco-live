# document-title Specification

## Purpose
The name of the app that the browser tab shows on every page of Reco Live.

## Requirements

### Requirement: App name in the browser tab

The document title SHALL be `Reco Live` on every page of the app (one title for the whole app; no per-page titles).

#### Scenario: Tab title on the home page

- **WHEN** the user opens `/`
- **THEN** the browser tab shows `Reco Live`

#### Scenario: Tab title on other pages

- **WHEN** the user opens `/product` or `/nope`
- **THEN** the browser tab shows `Reco Live`
