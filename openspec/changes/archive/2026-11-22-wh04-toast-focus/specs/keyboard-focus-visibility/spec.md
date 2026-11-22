## ADDED Requirements

### Requirement: Focus after F6 is visible

The system SHALL satisfy the following. With a toast showing, F6 moves focus to the frontmost toast, which shows the focus fill at least 3:1 against its resting fill and the page. Tab and Shift+Tab return focus to the focusable element it came from, also after a second F6.

#### Scenario: Case 1

- **WHEN** a toast shows and F6 is pressed
- **THEN** the toast has focus and shows the focus fill

#### Scenario: Case 2

- **WHEN** no toast shows and F6 is pressed
- **THEN** focus stays where it was

#### Scenario: Case 3

- **WHEN** F6 is pressed again on the toast, then Tab or Shift+Tab
- **THEN** focus leaves the toast region and returns to where it was before the first F6
