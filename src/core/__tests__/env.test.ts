import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('defaults to dev and treats empty strings as missing', () => {
    expect(parseEnv({ supabaseUrl: '', supabaseAnonKey: '' })).toEqual({ appEnv: 'dev' });
  });
  it('accepts a valid config', () => {
    const cfg = parseEnv({
      appEnv: 'prod',
      supabaseUrl: 'https://abc.supabase.co',
      supabaseAnonKey: 'sb_publishable_xxxxxxxxxxxxxxxx',
    });
    expect(cfg.appEnv).toBe('prod');
  });
  it('names the invalid field without echoing its value', () => {
    expect(() => parseEnv({ supabaseUrl: 'not a url' })).toThrow(/supabaseUrl/);
    expect(() => parseEnv({ appEnv: 'production' })).toThrow(/appEnv/);
  });
});
