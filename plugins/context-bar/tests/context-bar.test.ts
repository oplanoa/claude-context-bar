import { describe, expect, mock, test } from 'claude-code/testing';
import type { CommandRunInput, SessionStartInput } from 'claude-code';

const start: SessionStartInput = { surface: 'desktop', isInteractive: true, cwd: '/work' };
const toggle: CommandRunInput = { command: 'context-bar', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } };
const band = { plugin: 'context-bar', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 80, scroll: { offset: 0, bodyRows: 6 }, view: {} } } as const;
const categories = [
  { name: 'System prompt', tokens: 10000, color: 'cyan', isDeferred: false, kind: 'used' },
  { name: 'Messages', tokens: 20000, color: 'yellow', isDeferred: false, kind: 'used' },
  { name: 'mcp__private_server__secret_tool', tokens: 5000, color: 'blue', isDeferred: false, kind: 'used' },
  { name: 'Secret skill name', tokens: 4000, color: 'magenta', isDeferred: false, kind: 'used' },
  { name: 'Secret memory filename', tokens: 1000, color: 'green', isDeferred: false, kind: 'used' },
  { name: 'Free space', tokens: 120000, color: 'gray', isDeferred: false, kind: 'free' },
  { name: 'Autocompact buffer', tokens: 40000, color: 'red', isDeferred: false, kind: 'buffer' },
];

describe('context-bar', () => {
  test('renders full-width bar and only safe aggregate categories', async ($, on) => {
    mock.store(on);
    on('session.start', ($, e) => ({ cwd: e.cwd }));
    on('command.register', ($, e) => ({ value: { command: e.name } }));
    on('session.usage', () => ({ value: { context: { tokens: 50000, window: 200000, percent: 25, breakdown: { categories } }, rateLimits: [] } }));
    on('ui.invalidate', () => ({ value: undefined }));
    on('ui.render', () => ({ type: 'Text', props: {}, children: ['underlay'] }));
    await $.session.start(start);
    const view = await $.ui.mount({ ...band, surface: 'desktop' });
    expect(await view.find({ type: 'Text', text: /^▰+▱+$/ })).toBeDefined();
    expect(await view.find({ type: 'Text', text: /System prompt|Messages|MCP tools|Other|Free space/ })).toBeDefined();
    expect(await view.find({ type: 'Text', text: /mcp__private_server|Secret skill|Secret memory/ })).toBeUndefined();
    await view.unmount();
    await $.command.run(toggle);
    const hidden = await $.ui.mount({ ...band, surface: 'desktop' });
    expect(await hidden.find({ type: 'Text', text: /^▰+▱+$/ })).toBeUndefined();
    await hidden.unmount();
  });

  test('refreshes summary and categories after main-agent turn', async ($, on) => {
    mock.store(on);
    on('session.start', ($, e) => ({ cwd: e.cwd }));
    on('command.register', ($, e) => ({ value: { command: e.name } }));
    let percent = 25;
    on('session.usage', () => ({ value: { context: { tokens: percent * 2000, window: 200000, percent, breakdown: { categories: [{ name: 'Messages', tokens: percent * 2000, color: 'cyan', isDeferred: false, kind: 'used' }] } }, rateLimits: [] } }));
    on('ui.invalidate', () => ({ value: undefined }));
    on('ui.render', () => ({ type: 'Text', props: {}, children: ['underlay'] }));
    on('turn.complete', () => ({ text: 'done' }));
    await $.session.start(start);
    percent = 50;
    await $.turn.complete({ agentId: undefined });
    const view = await $.ui.mount({ ...band, surface: 'desktop' });
    expect(await view.find({ type: 'Text', text: /50%/ })).toBeDefined();
    expect(await view.find({ type: 'Text', text: 'Messages 100k (50%)' })).toBeDefined();
    await view.unmount();
  });

  test('renders categories when available in narrow viewport', async ($, on) => {
    mock.store(on);
    on('session.start', ($, e) => ({ cwd: e.cwd }));
    on('command.register', ($, e) => ({ value: { command: e.name } }));
    const many = ['System prompt', 'Messages', 'MCP tools', 'Tools', 'Skills', 'Memory', 'Agents', 'Commands', 'Other', 'Free space', 'Autocompact buffer'].map((name) => ({ name, tokens: 1000, color: 'cyan', isDeferred: false, kind: name === 'Free space' ? 'free' : name === 'Autocompact buffer' ? 'buffer' : 'used' }));
    on('session.usage', () => ({ value: { context: { tokens: 10000, window: 200000, percent: 5, breakdown: { categories: many } }, rateLimits: [] } }));
    on('ui.invalidate', () => ({ value: undefined }));
    on('ui.render', () => ({ type: 'Text', props: {}, children: ['underlay'] }));
    await $.session.start(start);
    const view = await $.ui.mount({ ...band, props: { ...band.props, bodyColumns: 36 }, surface: 'desktop' });
    expect(await view.find({ type: 'Text', text: /^▰+▱+$/ })).toBeDefined();
    expect(await view.find({ type: 'Text', text: 'Compaction buffer 1k (1%)' })).toBeDefined();
    await view.unmount();
  });
});
