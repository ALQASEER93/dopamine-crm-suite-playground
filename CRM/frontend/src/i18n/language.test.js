import { describe, expect, it } from 'vitest';

import { LANGUAGES, applyDocumentLanguage } from './language';

describe('language foundation', () => {
  it('keeps Arabic as the default RTL language', () => {
    expect(LANGUAGES.ar.dir).toBe('rtl');
    expect(LANGUAGES.ar.label).toBe('العربية');
  });

  it('can switch document direction to English LTR', () => {
    const resolved = applyDocumentLanguage('en');

    expect(resolved.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
