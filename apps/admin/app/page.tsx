'use client';

import { isLanguage, SUPPORTED_LANGUAGES, type Language } from '@sparc/core';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { saveLanguage } from '@/lib/i18n';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

// ফেজ ১-এর অ্যাডমিন: লগইন আর "আমার প্রতিষ্ঠান ও ভূমিকা"। আসল অ্যাডমিন স্ক্রিন ফেজ ৩-এ।
const APP_NAME = 'SPARC Admin';

type AccessRow = {
  institution_id: string;
  name: string;
  role_keys: string[];
  permissions: string[];
};

export default function AdminHome() {
  const { t, i18n } = useTranslation();
  const language: Language = isLanguage(i18n.language) ? i18n.language : 'bn';
  const [session, setSession] = useState<Session | null>(null);
  // কনফিগ না থাকলে অপেক্ষার কিছু নেই
  const [ready, setReady] = useState(() => !isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const switchLanguage = (lang: Language) => {
    saveLanguage(lang);
    void i18n.changeLanguage(lang);
  };

  return (
    <main className="page">
      <div className="row">
        <h1>{APP_NAME}</h1>
        <div className="row">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              className={lang === language ? undefined : 'secondary'}
              aria-pressed={lang === language}
              onClick={() => switchLanguage(lang)}>
              {t(`settings.language.${lang}`)}
            </button>
          ))}
        </div>
      </div>

      {!isSupabaseConfigured() ? (
        <p className="danger">{t('admin.notConfigured')}</p>
      ) : !ready ? (
        <p className="muted">{t('admin.loading')}</p>
      ) : session ? (
        <Dashboard email={session.user.email ?? ''} />
      ) : (
        <LoginForm />
      )}
    </main>
  );
}

function LoginForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(false);
    const { error: authError } = await getSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) setError(true);
  };

  return (
    <form className="card" onSubmit={submit}>
      <h2>{t('admin.login.title')}</h2>
      <label>
        {t('admin.login.email')}
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        {t('admin.login.password')}
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p className="danger" role="alert">
          {t('admin.login.error')}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? t('admin.loading') : t('admin.login.submit')}
      </button>
    </form>
  );
}

function Dashboard({ email }: { email: string }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<AccessRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      const [access, institutions] = await Promise.all([
        supabase.rpc('my_access'),
        supabase.from('institutions').select('id, name, name_bn'),
      ]);
      if (cancelled) return;
      if (access.error || institutions.error) {
        // এরর হলে "খালি" নয়, "লোড ব্যর্থ" দেখানো (§২০.১)
        setFailed(true);
        return;
      }
      const names = new Map(
        institutions.data.map((i) => [
          i.id,
          i18n.language === 'bn' && i.name_bn ? i.name_bn : i.name,
        ]),
      );
      setRows(
        access.data.map((a) => ({
          institution_id: a.institution_id,
          name: names.get(a.institution_id) ?? a.institution_id,
          role_keys: a.role_keys,
          permissions: a.permissions,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  return (
    <section className="card">
      <div className="row">
        <div>
          <h2>{t('admin.access.title')}</h2>
          <p className="muted">{t('admin.access.signedInAs', { email })}</p>
        </div>
        <button type="button" className="secondary" onClick={() => getSupabase().auth.signOut()}>
          {t('admin.logout')}
        </button>
      </div>
      {failed ? (
        <p className="danger" role="alert">
          {t('admin.access.loadFailed')}
        </p>
      ) : rows === null ? (
        <p className="muted">{t('admin.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{t('admin.access.none')}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t('admin.access.institution')}</th>
              <th>{t('admin.access.roles')}</th>
              <th>{t('admin.access.permissions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.institution_id}>
                <td>{r.name}</td>
                <td>{r.role_keys.join(', ')}</td>
                <td>
                  <code>{r.permissions.join(', ')}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
