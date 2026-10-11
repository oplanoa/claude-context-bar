# Context Bar marketplace

Claude Code plugin marketplace for `context-bar`, a mod that displays reported context-window usage above the prompt.

## Install in Claude Code Desktop

1. Open the Code session where you want the mod.
2. Run `/plugin marketplace add oplanoa/claude-context-bar`.
3. Run `/plugin install context-bar@claude-context-bar`.
4. Reload plugins if prompted, then use `/context-bar` to toggle the bar.

## What it shows

A compact progress bar, used percentage, and used/total token count. Usage refreshes after each main-agent turn.

## Verification

The plugin passes `claude plugin validate --strict`; automated tests cover the Desktop render surface, toggle, and update after a turn. Live rendering in the Desktop app has not yet been manually verified.

## License

The marketplace and plugin are licensed under Apache-2.0. See [LICENSE](LICENSE).
