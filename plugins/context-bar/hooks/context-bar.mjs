// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

const COMMAND = "context-bar";
const STORE_KEY = "visible";
const FILLED = "▰";
const EMPTY = "▱";
const SAFE_CATEGORIES = {
  "System prompt": "System prompt",
  Messages: "Messages",
  "MCP tools": "MCP tools",
  "MCP servers": "MCP tools",
  "Custom tools": "Tools",
  "System tools": "Tools",
  "Skills": "Skills",
  "Memory files": "Memory",
  Agents: "Agents",
  "Slash commands": "Commands",
  "Custom commands": "Commands",
};

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
    return renderUsage(Box, Text, e.bodyColumns ?? 80);
  });
}

async function takeReading($) {
  try {
    const { context } = await $.session.usage({ breakdown: "summary" });
    if (!context?.window) return;
    const tokens = context.tokens ?? 0;
    const breakdown = context.breakdown;
    usage = {
      tokens,
      window: context.window,
      percent: Math.max(0, Math.min(100, Math.round(context.percent ?? (tokens / context.window) * 100))),
      categories: aggregateCategories(breakdown?.categories ?? [], context.window),
    };
    $.ui.invalidate("ui.render");
  } catch {
    // Keep the last successful reading when usage is temporarily unavailable.
  }
}

function aggregateCategories(categories, window) {
  const totals = new Map();
  for (const category of categories) {
    let label;
    if (category.kind === "free") label = "Free space";
    else if (category.kind === "buffer") label = "Compaction buffer";
    else if (category.kind === "deferred") label = "Deferred tools";
    else label = SAFE_CATEGORIES[category.name] ?? "Other";
    totals.set(label, (totals.get(label) ?? 0) + category.tokens);
  }
  return [...totals].map(([label, tokens]) => ({
    label,
    tokens,
    percent: Math.round((tokens / window) * 100),
  })).filter((item) => item.tokens > 0);
}

function renderUsage(Box, Text, columns) {
  const percent = usage.percent;
  const barWidth = Math.max(1, columns - 2);
  const filled = Math.round((percent / 100) * barWidth);
  const color = percent >= 90 ? "red" : percent >= 75 ? "magenta" : percent >= 50 ? "yellow" : "green";
  const bar = Box({
    flexDirection: "row",
    width: "100%",
    paddingX: 1,
    children: [Text({ color, bold: true, children: FILLED.repeat(filled) + EMPTY.repeat(barWidth - filled) })],
  });
  const rows = categoryRows(usage.categories, columns);
  const children = [bar];
  for (const row of rows) {
    children.push(Box({
      flexDirection: "row",
      flexWrap: "wrap",
      paddingX: 1,
      children: row.map((item) => Text({ dimColor: true, children: item.label + " " + short(item.tokens) + " (" + item.percent + "%)" })),
    }));
  }
  return Box({ flexDirection: "column", width: "100%", children });
}

function categoryRows(categories, columns) {
  const rows = [[]];
  let used = 2;
  for (const item of categories) {
    const label = item.label + " " + short(item.tokens) + " (" + item.percent + "%)";
    const itemWidth = label.length + 2;
    if (used + itemWidth > columns && rows.length < 3) {
      rows.push([]);
      used = 2;
    }
    const row = rows[rows.length - 1];
    if (used + itemWidth <= columns) {
      row.push(item);
      used += itemWidth;
      continue;
    }
    const other = row.find((entry) => entry.label === "Other");
    if (other) {
      other.tokens += item.tokens;
      other.percent += item.percent;
    } else {
      row.push({ label: "Other", tokens: item.tokens, percent: item.percent });
    }
  }
  return rows.filter((row) => row.length > 0);
}

function short(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + "k";
  return String(value);
}
