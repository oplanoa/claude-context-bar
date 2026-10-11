// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

const COMMAND = "context-bar";
const STORE_KEY = "visible";
const BAR_WIDTH = 12;
const FILLED = "▰";
const EMPTY = "▱";

let visible = true;
let usage = null;

export function register(on) {
  on("session.start", async ($, e, next) => {
    const result = await next(e);
    visible = (await $.store.get(STORE_KEY)) !== false;
    await $.command.register({
      name: COMMAND,
      description: "Show or hide context usage above the prompt",
      immediate: true,
    });
    await takeReading($);
    return result;
  });

  on("turn.complete", async ($, e, next) => {
    if (!e.agentId) await takeReading($);
    return next(e);
  }).catch(($, e, next) => next.called ? next(e) : { text: "" });

  on("command.run", { command: COMMAND }, async ($) => {
    visible = !visible;
    await $.store.set(STORE_KEY, visible);
    $.ui.invalidate("ui.render");
    return { text: visible ? "Context bar is on." : "Context bar is off." };
  }).catch(async ($, e, next) => {
    if (next.called) return next(e);
    return { text: "Could not toggle the context bar." };
  });

  on("ui.render", { component: "AbovePrompt" }, ($, e, next) => {
    if (!visible || e.hasSurvey || !usage) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    return renderBar(Box, Text, e.bodyColumns ?? 80);
  });
}

async function takeReading($) {
  try {
    const { context } = await $.session.usage();
    if (!context?.window) return;
    const tokens = context.tokens ?? 0;
    usage = {
      tokens,
      window: context.window,
      percent: Math.max(0, Math.min(100, Math.round(context.percent ?? (tokens / context.window) * 100))),
    };
    $.ui.invalidate("ui.render");
  } catch {
    // Keep the last successful reading when usage is temporarily unavailable.
  }
}

function renderBar(Box, Text, columns) {
  const percent = usage.percent;
  const filled = Math.round((percent / 100) * BAR_WIDTH);
  const color = percent >= 90 ? "red" : percent >= 75 ? "magenta" : percent >= 50 ? "yellow" : "green";
  const children = [
    Text({ color, bold: true, children: FILLED.repeat(filled) + EMPTY.repeat(BAR_WIDTH - filled) }),
    Text({ children: "  " + percent + "%" }),
  ];
  if (columns >= 40) {
    children.push(Text({ dimColor: true, children: "  " + short(usage.tokens) + " / " + short(usage.window) + " tokens" }));
  }
  return Box({ flexDirection: "row", paddingX: 1, children });
}

function short(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + "k";
  return String(value);
}
