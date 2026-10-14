import { describe, expect, it } from 'bun:test';
import { composeDocumentTitle, stageTitle, createTitleController } from '../src/utils/documentTitle';

describe('documentTitle', () => {
  it('builds "Stage | Family | QA Helper"', () => {
    expect(stageTitle('Send transaction', 'RPC')).toBe('Send transaction | RPC | QA Helper');
    expect(stageTitle('Wallet initialization')).toBe('Wallet initialization | QA Helper');
  });

  it('prefixes mainnet', () => {
    expect(composeDocumentTitle('Send | RPC | QA Helper', true)).toBe('[Mainnet] Send | RPC | QA Helper');
    expect(composeDocumentTitle('QA Helper', false)).toBe('QA Helper');
  });

  it('composes the stage title and the mainnet flag set from two places, in any order', () => {
    const doc = { title: 'QA Helper' };
    const ctl = createTitleController(doc);
    ctl.setMainnet(true);
    expect(doc.title).toBe('[Mainnet] QA Helper');
    ctl.setBase('Get balance | Snap | QA Helper');
    expect(doc.title).toBe('[Mainnet] Get balance | Snap | QA Helper');
    ctl.setMainnet(false);
    expect(doc.title).toBe('Get balance | Snap | QA Helper');
    ctl.setBase('Inspector | Shielded | QA Helper');
    expect(doc.title).toBe('Inspector | Shielded | QA Helper');
  });

  it('starts from the existing title without a mainnet prefix', () => {
    const doc = { title: '[Mainnet] QA Helper' };
    const ctl = createTitleController(doc);
    ctl.setMainnet(false);
    expect(doc.title).toBe('QA Helper');
  });
});
