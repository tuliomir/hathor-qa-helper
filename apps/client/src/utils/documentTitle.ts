/**
 * The browser tab title has two writers: StageHeader sets the stage part
 * ("Send transaction | RPC | QA Helper") and NetworkRail adds "[Mainnet] ".
 * Both go through one controller so neither overwrites the other.
 */

export const APP_TITLE = 'QA Helper';
export const MAINNET_TITLE_PREFIX = '[Mainnet] ';

export function stageTitle(title: string, familyChip?: string): string {
  return [title, familyChip, APP_TITLE].filter(Boolean).join(' | ');
}

export function composeDocumentTitle(base: string, mainnet: boolean): string {
  return mainnet ? MAINNET_TITLE_PREFIX + base : base;
}

export function createTitleController(doc: { title: string }) {
  let base = doc.title.startsWith(MAINNET_TITLE_PREFIX) ? doc.title.slice(MAINNET_TITLE_PREFIX.length) : doc.title;
  let mainnet = false;
  const write = () => {
    doc.title = composeDocumentTitle(base, mainnet);
  };
  return {
    setBase(next: string) {
      base = next;
      write();
    },
    setMainnet(next: boolean) {
      mainnet = next;
      write();
    },
  };
}

const fallbackDoc = { title: APP_TITLE };

/** App-wide controller over `document.title`. */
export const documentTitle = createTitleController(typeof document === 'undefined' ? fallbackDoc : document);
