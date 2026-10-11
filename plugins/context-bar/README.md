# Context Bar

A Claude Code mod that shows context-window usage above the prompt with a full-width progress bar and privacy-safe aggregate categories.

## What this shows

The first line is a full-width progress bar. Below it, context categories such as system prompt, messages, tools, skills, memory, free space, and compaction buffer are grouped into up to three rows. Enter `/context-bar` to toggle the display.

## Demo

Desktop rendering has not yet been manually captured.

## Development notes

This plugin uses `$.session.usage({ breakdown: "summary" })` and the `AbovePrompt` render site. Summary breakdown estimates locally and does not send token-count requests. Category names are mapped into a fixed set of aggregate labels; raw names and detail arrays are never rendered. Automated tests exercise the Desktop render surface, privacy-safe aggregation, toggle, and turn refresh. Live rendering in the Desktop app remains unverified.

## Run it

**Requirements:** Claude Code 2.1.287 or later, with mods enabled.

**Steps:**

1. In Claude Code, add marketplace `oplanoa/claude-context-bar` and install `context-bar@claude-context-bar`. For a single CLI session, use `claude --plugin-dir ./plugins/context-bar`.
2. Start a conversation; context usage updates after each main-agent turn.
3. Enter `/context-bar` to toggle visibility.

## Notes / limitations

- Usage updates after each turn, not while Claude is generating a response.
- Before the first response, the bar may show 0% if the host reports an empty context reading.
- The band shares the `AbovePrompt` render site; another mod drawing there may conflict.
- Desktop rendering has not been manually verified or screenshotted in this environment. Validate on the target Claude Code Desktop version.
- Token counts are abbreviated for readability.

## Dependencies

| Name | Version | License (SPDX) | Source |
| --- | --- | --- | --- |
| None | | | |

## Third-party notices

Claude Code is a trademark of Anthropic; use here is descriptive and implies no endorsement.

---

Released under the Apache License, Version 2.0. See [LICENSE](../../LICENSE).
