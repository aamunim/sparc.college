import { isLanguage, pickLanguage } from '../config';

describe('pickLanguage', () => {
  it('picks the first supported language', () => {
    expect(pickLanguage(['fr-FR', 'en-US', 'bn-BD'])).toBe('en');
    expect(pickLanguage(['bn_BD'])).toBe('bn');
  });
  it('falls back to Bangla', () => {
    expect(pickLanguage(['fr', null, undefined])).toBe('bn');
    expect(pickLanguage([])).toBe('bn');
  });
});

describe('isLanguage', () => {
  it('accepts only supported codes', () => {
    expect(isLanguage('bn')).toBe(true);
    expect(isLanguage('ar')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});
