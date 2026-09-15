import { describe, expect, it } from 'vitest';
import { QUICK_ACTIONS, TOOL_GROUPS } from './dashboard.config';

describe('Campesino Dashboard Config Standard', () => {
  it('QUICK_ACTIONS must have valid paths and semantic color tokens', () => {
    expect(QUICK_ACTIONS.length).toBeGreaterThan(0);
    for (const action of QUICK_ACTIONS) {
      expect(action.path).toMatch(/^\/campesino/);
      expect(action.label.trim().length).toBeGreaterThan(0);
      expect(action.color).toMatch(/bg-(emerald|amber|rose|sky|primary)/);
    }
  });

  it('TOOL_GROUPS must not have emoji characters in title or tools', () => {
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const group of TOOL_GROUPS) {
      expect(emojiRegex.test(group.title)).toBe(false);
      for (const tool of group.tools) {
        expect(emojiRegex.test(tool.title)).toBe(false);
        expect(tool.emoji).toBeFalsy();
      }
    }
  });

  it('TOOL_GROUPS tools must have valid paths', () => {
    for (const group of TOOL_GROUPS) {
      for (const tool of group.tools) {
        expect(tool.path.length).toBeGreaterThan(0);
        expect(tool.title.length).toBeGreaterThan(0);
        expect(tool.description.length).toBeGreaterThan(0);
      }
    }
  });
});
