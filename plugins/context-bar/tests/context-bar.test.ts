import { describe, expect, mock, test } from 'claude-code/testing';
import type { CommandRunInput, SessionStartInput } from 'claude-code';

const start: SessionStartInput = { surface: 'desktop', isInteractive: true, cwd: '/work' };
const toggle: CommandRunInput = { command: "context-bar", args: "", origin: { kind: "composer" }, presentation: { isFullscreen: false, columns: 80 } };
const band = { plugin: 'context-bar', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 80, scroll: { offset: 0, bodyRows: 6 }, view: {} } } as const;

describe('context-bar', () => {
  test("renders desktop context usage and toggles it off and on", async ($, on) => {
    mock.store(on);
    on("session.start", ($, e) => ({ cwd: e.cwd }));
    on("command.register", ($, e) => ({ value: { command: e.name } }));
    on("session.usage", () => ({ value: { context: { tokens: 50000, window: 200000, percent: 25 }, rateLimits: [] } }));
    on("ui.invalidate", () => ({ value: undefined }));
    on("ui.render", () => ({ type: "Text", props: {}, children: ["underlay"] }));
    await $.session.start(start);
    const first = await $.ui.mount({ ...band, surface: "desktop" });
    expect(await first.find({ type: "Text", text: /25%/ })).toBeDefined();
    expect(await first.find({ type: "Text", text: /▰+▱+/ })).toBeDefined();
    await first.unmount();
    await $.command.run(toggle);
    const hidden = await $.ui.mount({ ...band, surface: "desktop" });
    expect(await hidden.find({ type: "Text", text: /25%/ })).toBeUndefined();
    await hidden.unmount();
    await $.command.run(toggle);
    const shown = await $.ui.mount({ ...band, surface: "desktop" });
    expect(await shown.find({ type: "Text", text: /25%/ })).toBeDefined();
    await shown.unmount();
  });

  test("updates after the main-agent turn", async ($, on) => {
    mock.store(on);
    on("session.start", ($, e) => ({ cwd: e.cwd }));
    on("command.register", ($, e) => ({ value: { command: e.name } }));
    let percent = 25;
    on("session.usage", () => ({ value: { context: { tokens: percent * 2000, window: 200000, percent }, rateLimits: [] } }));
    on("ui.invalidate", () => ({ value: undefined }));
    on("ui.render", () => ({ type: "Text", props: {}, children: ["underlay"] }));
    on("turn.complete", () => ({ text: "done" }));
    await $.session.start(start);
    percent = 50;
    await $.turn.complete({ agentId: undefined });
    const updated = await $.ui.mount({ ...band, surface: "desktop" });
    expect(await updated.find({ type: "Text", text: /50%/ })).toBeDefined();
    await updated.unmount();
  });
});
