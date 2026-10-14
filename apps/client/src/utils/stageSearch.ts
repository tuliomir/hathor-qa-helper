/**
 * Stage search for the command palette.
 *
 * Every word of the query must match the stage somewhere: title, RPC/Snap
 * method name, group, family or description. Matches score by where and how
 * they hit (exact method or title first, then prefixes, then substrings,
 * then loose subsequences of the title); ties keep the navigation order.
 */

import {
  STAGE_FAMILIES,
  STAGE_GROUPS,
  type Stage,
  type StageFamily,
  type StageGroup,
  type StageId,
} from '../types/stage';

export interface StageSearchResult {
  stage: Stage;
  group: StageGroup;
  family: StageFamily;
  score: number;
}

interface Entry {
  stage: Stage;
  group: StageGroup;
  family: StageFamily;
  order: number;
  title: string;
  methods: string[];
  context: string;
  description: string;
}

const ENTRIES: Entry[] = STAGE_GROUPS.flatMap((group) => {
  const family = STAGE_FAMILIES.find((f) => f.id === group.family)!;
  return group.stages.map((stage) => ({
    stage,
    group,
    family,
    order: 0,
    title: stage.title.toLowerCase(),
    methods: (stage.methods ?? []).map((m) => m.toLowerCase()),
    context: `${group.title} ${family.title} ${family.chip}`.toLowerCase(),
    description: stage.description.toLowerCase(),
  }));
}).map((entry, order) => ({ ...entry, order }));

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const char of haystack) {
    if (char === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

function wordStarts(text: string, word: string): boolean {
  return text.split(/[\s+/_-]+/).some((part) => part.startsWith(word));
}

/** Best score for one query word against one stage; 0 when it does not match. */
function scoreWord(entry: Entry, word: string): number {
  let best = 0;
  const hit = (score: number) => (best = Math.max(best, score));

  for (const method of entry.methods) {
    if (method === word) hit(100);
    else if (method.includes(word)) hit(word.length >= 4 ? 60 : 30);
  }
  if (entry.title === word) hit(90);
  else if (entry.title.startsWith(word)) hit(75);
  else if (wordStarts(entry.title, word)) hit(65);
  else if (entry.title.includes(word)) hit(50);
  if (wordStarts(entry.context, word)) hit(40);
  else if (entry.context.includes(word)) hit(30);
  if (wordStarts(entry.description, word)) hit(25);
  else if (entry.description.includes(word)) hit(15);
  if (!best && word.length >= 3 && isSubsequence(word, entry.title.replace(/\s+/g, ''))) hit(10);
  return best;
}

export function searchStages(query: string): StageSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);

  const results: (StageSearchResult & { order: number })[] = [];
  for (const entry of ENTRIES) {
    let score = 0;
    for (const word of words) {
      const s = scoreWord(entry, word);
      if (s === 0) {
        score = 0;
        break;
      }
      score += s;
    }
    // The whole query as one title phrase beats the same words scattered.
    if (score > 0 && words.length > 1 && entry.title.includes(q)) score += 50;
    if (score > 0)
      results.push({ stage: entry.stage, group: entry.group, family: entry.family, score, order: entry.order });
  }

  results.sort((a, b) => b.score - a.score || a.order - b.order);
  return results.map(({ stage, group, family, score }) => ({ stage, group, family, score }));
}

/** Look up a stage with its group and family (for the Recent list). */
export function stageEntry(id: StageId): Omit<StageSearchResult, 'score'> | null {
  const entry = ENTRIES.find((e) => e.stage.id === id);
  return entry ? { stage: entry.stage, group: entry.group, family: entry.family } : null;
}

export const RECENT_STAGES_LIMIT = 5;

/** Most recent first, no duplicates, at most RECENT_STAGES_LIMIT. */
export function pushRecentStage(list: StageId[], id: StageId): StageId[] {
  return [id, ...list.filter((existing) => existing !== id)].slice(0, RECENT_STAGES_LIMIT);
}
