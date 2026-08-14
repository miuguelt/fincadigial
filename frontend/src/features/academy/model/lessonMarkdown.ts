export type LessonBlock =
  | { kind: 'heading'; level: 2 | 3 | 4; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

interface ParserState {
  blocks: LessonBlock[];
  paragraph: string[];
  list: { ordered: boolean; items: string[] } | null;
  table: string[][] | null;
}

const HEADING = /^(#{1,4})\s+(.+)$/;
const BULLET = /^[-*]\s+(.+)$/;
const ORDERED = /^\d+[.)]\s+(.+)$/;
const TABLE_SEPARATOR = /^\|[\s|:-]+\|$/;

const flushParagraph = (state: ParserState): void => {
  if (!state.paragraph.length) return;
  state.blocks.push({ kind: 'paragraph', text: state.paragraph.join(' ') });
  state.paragraph = [];
};

const flushList = (state: ParserState): void => {
  if (!state.list) return;
  state.blocks.push({ kind: 'list', ordered: state.list.ordered, items: state.list.items });
  state.list = null;
};

const flushTable = (state: ParserState): void => {
  if (!state.table?.length) {
    state.table = null;
    return;
  }
  const [header, ...rows] = state.table;
  state.blocks.push({ kind: 'table', header, rows });
  state.table = null;
};

const flushAll = (state: ParserState): void => {
  flushParagraph(state);
  flushList(state);
  flushTable(state);
};

const readHeading = (state: ParserState, line: string): boolean => {
  const match = HEADING.exec(line);
  if (!match) return false;
  flushAll(state);
  const level = Math.min(4, Math.max(2, match[1].length)) as 2 | 3 | 4;
  state.blocks.push({ kind: 'heading', level, text: match[2] });
  return true;
};

const pushListItem = (state: ParserState, ordered: boolean, text: string): void => {
  flushParagraph(state);
  flushTable(state);
  if (state.list && state.list.ordered !== ordered) flushList(state);
  if (!state.list) state.list = { ordered, items: [] };
  state.list.items.push(text);
};

const readList = (state: ParserState, line: string): boolean => {
  const bullet = BULLET.exec(line);
  if (bullet) {
    pushListItem(state, false, bullet[1]);
    return true;
  }
  const ordered = ORDERED.exec(line);
  if (!ordered) return false;
  pushListItem(state, true, ordered[1]);
  return true;
};

const readTable = (state: ParserState, line: string): boolean => {
  if (!line.startsWith('|') || !line.endsWith('|')) return false;
  flushParagraph(state);
  flushList(state);
  if (TABLE_SEPARATOR.test(line)) return true;
  const cells = line.slice(1, -1).split('|').map((cell) => cell.trim());
  state.table = [...(state.table ?? []), cells];
  return true;
};

/** Convierte el markdown simple de las lecciones en bloques tipados y seguros. */
export function parseLessonContent(content: string): LessonBlock[] {
  const state: ParserState = { blocks: [], paragraph: [], list: null, table: null };

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushAll(state);
      continue;
    }
    if (readHeading(state, line)) continue;
    if (readList(state, line)) continue;
    if (readTable(state, line)) continue;
    flushList(state);
    flushTable(state);
    state.paragraph.push(line);
  }

  flushAll(state);
  return state.blocks;
}
