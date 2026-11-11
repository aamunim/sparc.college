import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';

import { useAppTheme, Button, Card, Text } from '@/ui';

import { devSignIn } from '../api';

/** শুধু dev পরিবেশে দেখায় (appEnv = dev) — প্রোডাকশনে নয়। */
export function DevLoginCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 12,
  };

  const submit = async () => {
    setBusy(true);
    setError(false);
    const ok = await devSignIn(email.trim(), password);
    setBusy(false);
    if (!ok) setError(true);
  };

  return (
    <Card className="gap-3">
      <Text variant="heading">{t('devLogin.title')}</Text>
      <Text variant="caption" tone="muted">
        {t('devLogin.hint')}
      </Text>
      <TextInput
        accessibilityLabel={t('devLogin.email')}
        placeholder={t('devLogin.email')}
        placeholderTextColor={colors['text-muted']}
        autoCapitalize="none"
        keyboardType="email-address"
        inputMode="email"
        value={email}
        onChangeText={setEmail}
        style={inputStyle}
      />
      <TextInput
        accessibilityLabel={t('devLogin.password')}
        placeholder={t('devLogin.password')}
        placeholderTextColor={colors['text-muted']}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
        style={inputStyle}
      />
      {error ? <Text tone="danger">{t('devLogin.error')}</Text> : null}
      <Button label={t('devLogin.submit')} loading={busy} onPress={submit} />
    </Card>
  );
}
