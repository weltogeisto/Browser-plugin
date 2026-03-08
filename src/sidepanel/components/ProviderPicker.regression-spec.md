# ProviderPicker UI Regression Spec

## Scenario 1: zero enabled providers
- Given all provider configs are disabled or missing API keys.
- When the side panel renders `ProviderPicker`.
- Then no `<select>` controls are rendered.
- And the user sees guidance text: "Enable providers and add API keys in Settings first."

## Scenario 2: one enabled provider
- Given exactly one provider is enabled with a non-empty API key.
- When the side panel renders `ProviderPicker`.
- Then two provider selectors are visible.
- And both selectors are normalized to the only enabled provider ID.

## Scenario 3: two+ enabled providers with duplicate selection attempt
- Given at least two enabled providers with API keys.
- When the user changes one selector to duplicate the other selection.
- Then `selectedProviderIds` are automatically reconciled to two valid, distinct enabled provider IDs.
- And invalid/duplicate state is not persisted in component state.
