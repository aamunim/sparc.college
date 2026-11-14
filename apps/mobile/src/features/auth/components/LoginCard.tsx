import { listenForOtp } from '@modules/sms-retriever';
import { formatBdPhone, normalizeBdPhone, toLatinDigits } from '@sparc/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { z } from 'zod';

import { useAppTheme, Button, Card, Text } from '@/ui';

import { requestOtp, signInWithGoogle, verifyOtp, type OtpChannel } from '../api';

const RESEND_SECONDS = 60; // সার্ভারের auth.sms / auth.email max_frequency-র সমান
const OTP_LENGTH = 6;
const emailSchema = z.string().trim().toLowerCase().email().max(254);

type ErrorKey =
  'invalidPhone' | 'invalidEmail' | 'rateLimited' | 'failed' | 'invalidCode' | 'googleFailed';

/**
 * লগইন: ফোন বা ইমেইল → ৬ অঙ্কের কোড; অথবা Google।
 * সফল হলে SessionProvider নিজেই সেশন ধরে।
 */
export function LoginCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [channel, setChannel] = useState<OtpChannel>('phone');
  const [input, setInput] = useState('');
  const [target, setTarget] = useState<string | null>(null); // কোড পাঠানো হলে: E.164 বা ইমেইল
  const [code, setCode] = useState('');
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const stopListening = useRef<() => void>(() => {});
  const lastSubmitted = useRef('');

  // স্ক্রিন বন্ধ হলে SMS শোনা বন্ধ
  useEffect(() => () => stopListening.current(), []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 12,
    fontSize: 18,
  };

  const verify = useCallback(async (ch: OtpChannel, to: string, otp: string) => {
    if (lastSubmitted.current === otp) return; // একই কোড দুবার নয় (অটোরিড + অটো-সাবমিট)
    lastSubmitted.current = otp;
    setBusy(true);
    setError(null);
    const result = await verifyOtp(ch, to, otp);
    setBusy(false);
    if (result === 'ok') {
      stopListening.current();
      return;
    }
    lastSubmitted.current = '';
    setError(
      result === 'invalid' ? 'invalidCode' : result === 'rate_limited' ? 'rateLimited' : 'failed',
    );
  }, []);

  const send = async (ch: OtpChannel, to: string) => {
    setBusy(true);
    setError(null);
    stopListening.current();
    // Android: SMS আসার আগেই শোনা শুরু করতে হয় (SMS Retriever, অনুমতি লাগে না)
    if (ch === 'phone') {
      stopListening.current = listenForOtp((otp) => {
        setCode(otp);
        void verify(ch, to, otp);
      }, OTP_LENGTH);
    }
    const result = await requestOtp(ch, to);
    setBusy(false);
    if (result === 'sent') {
      setTarget(to);
      setCode('');
      lastSubmitted.current = '';
      setResendIn(RESEND_SECONDS);
    } else {
      stopListening.current();
      setError(result === 'rate_limited' ? 'rateLimited' : 'failed');
    }
  };

  const submitTarget = () => {
    if (channel === 'phone') {
      const phone = normalizeBdPhone(input);
      if (!phone) return setError('invalidPhone');
      return void send('phone', phone);
    }
    const email = emailSchema.safeParse(input);
    if (!email.success) return setError('invalidEmail');
    void send('email', email.data);
  };

  const submitCode = () => {
    if (!target || code.length !== OTP_LENGTH) return setError('invalidCode');
    void verify(channel, target, code);
  };

  const onCodeChange = (value: string) => {
    const digits = toLatinDigits(value).replace(/\D/g, '');
    setCode(digits);
    // ৬ অঙ্ক পূর্ণ হলে নিজে থেকেই যাচাই (কিবোর্ডের সাজেশন/অটোফিল থেকে এলেও)
    if (target && digits.length === OTP_LENGTH) void verify(channel, target, digits);
  };

  const reset = () => {
    stopListening.current();
    lastSubmitted.current = '';
    setTarget(null);
    setCode('');
    setError(null);
  };

  const google = async () => {
    setGoogleBusy(true);
    setError(null);
    const result = await signInWithGoogle();
    setGoogleBusy(false);
    if (result === 'failed') setError('googleFailed');
  };

  const errorText = error ? <Text tone="danger">{t(`login.error.${error}`)}</Text> : null;

  if (target) {
    const shown = channel === 'phone' ? formatBdPhone(target) : target;
    return (
      <Card className="gap-3">
        <Text variant="heading">{t('login.codeTitle')}</Text>
        <Text tone="muted">{t('login.codeSentTo', { target: shown })}</Text>
        {channel === 'email' ? (
          <Text variant="caption" tone="muted">
            {t('login.emailSpamHint')}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel={t('login.codeLabel')}
          placeholder={t('login.codePlaceholder')}
          placeholderTextColor={colors['text-muted']}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete={channel === 'phone' ? 'sms-otp' : 'one-time-code'}
          textContentType="oneTimeCode"
          maxLength={OTP_LENGTH}
          value={code}
          onChangeText={onCodeChange}
          onSubmitEditing={submitCode}
          style={{ ...inputStyle, letterSpacing: 6 }}
        />
        {errorText}
        <Button label={t('login.verify')} loading={busy} onPress={submitCode} />
        <Button
          label={resendIn > 0 ? t('login.resendIn', { seconds: resendIn }) : t('login.resend')}
          variant="secondary"
          disabled={resendIn > 0 || busy}
          onPress={() => void send(channel, target)}
        />
        <Button
          label={t(channel === 'phone' ? 'login.changePhone' : 'login.changeEmail')}
          variant="ghost"
          disabled={busy}
          onPress={reset}
        />
      </Card>
    );
  }

  const isPhone = channel === 'phone';
  return (
    <Card className="gap-3">
      <Text variant="heading">{t('login.title')}</Text>
      <View className="flex-row gap-2" accessibilityRole="tablist">
        {(['phone', 'email'] as const).map((ch) => (
          <Button
            key={ch}
            className="flex-1"
            label={t(ch === 'phone' ? 'login.tabPhone' : 'login.tabEmail')}
            variant={channel === ch ? 'primary' : 'secondary'}
            accessibilityRole="tab"
            accessibilityState={{ selected: channel === ch }}
            onPress={() => {
              setChannel(ch);
              setInput('');
              setError(null);
            }}
          />
        ))}
      </View>
      <Text tone="muted">{t(isPhone ? 'login.phoneHint' : 'login.emailHint')}</Text>
      <TextInput
        key={channel}
        accessibilityLabel={t(isPhone ? 'login.phoneLabel' : 'login.emailLabel')}
        placeholder={t(isPhone ? 'login.phonePlaceholder' : 'login.emailPlaceholder')}
        placeholderTextColor={colors['text-muted']}
        keyboardType={isPhone ? 'phone-pad' : 'email-address'}
        inputMode={isPhone ? 'tel' : 'email'}
        autoComplete={isPhone ? 'tel' : 'email'}
        textContentType={isPhone ? 'telephoneNumber' : 'emailAddress'}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={isPhone ? 20 : 254}
        value={input}
        onChangeText={(v) => {
          setInput(v);
          if (error) setError(null);
        }}
        onSubmitEditing={submitTarget}
        style={inputStyle}
      />
      {errorText}
      <Button label={t('login.sendCode')} loading={busy} onPress={submitTarget} />
      <Text tone="muted" className="text-center">
        {t('login.or')}
      </Text>
      <Button
        label={t('login.google')}
        variant="secondary"
        loading={googleBusy}
        onPress={() => void google()}
      />
    </Card>
  );
}
