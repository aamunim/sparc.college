import { formatBdPhone, normalizeBdPhone, toLatinDigits } from '@sparc/core';
import { listenForOtp } from '@modules/sms-retriever';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';

import { useAppTheme, Button, Card, Text } from '@/ui';

import { requestPhoneOtp, verifyPhoneOtp } from '../api';

const RESEND_SECONDS = 60; // সার্ভারের auth.sms.max_frequency-র সমান
const OTP_LENGTH = 6;

type ErrorKey = 'invalidPhone' | 'rateLimited' | 'failed' | 'invalidCode';

/** দুই ধাপ: নম্বর → কোড। সফল হলে SessionProvider নিজেই সেশন ধরে। */
export function PhoneLoginCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [input, setInput] = useState('');
  const [phone, setPhone] = useState<string | null>(null); // কোড পাঠানো হলে E.164
  const [code, setCode] = useState('');
  const [error, setError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
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

  const send = async (target: string) => {
    setBusy(true);
    setError(null);
    // Android: SMS আসার আগেই শোনা শুরু করতে হয় (SMS Retriever, অনুমতি লাগে না)
    stopListening.current();
    stopListening.current = listenForOtp((otp) => {
      setCode(otp);
      void verify(target, otp);
    }, OTP_LENGTH);
    const result = await requestPhoneOtp(target);
    setBusy(false);
    if (result === 'sent') {
      setPhone(target);
      setCode('');
      setResendIn(RESEND_SECONDS);
    } else {
      stopListening.current();
      setError(result === 'rate_limited' ? 'rateLimited' : 'failed');
    }
  };

  const submitPhone = () => {
    const normalized = normalizeBdPhone(input);
    if (!normalized) {
      setError('invalidPhone');
      return;
    }
    void send(normalized);
  };

  const verify = useCallback(async (target: string, otp: string) => {
    if (lastSubmitted.current === otp) return; // একই কোড দুবার নয় (অটোরিড + অটো-সাবমিট)
    lastSubmitted.current = otp;
    setBusy(true);
    setError(null);
    const result = await verifyPhoneOtp(target, otp);
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

  const submitCode = () => {
    if (!phone || code.length !== OTP_LENGTH) {
      setError('invalidCode');
      return;
    }
    void verify(phone, code);
  };

  const onCodeChange = (value: string) => {
    const digits = toLatinDigits(value).replace(/\D/g, '');
    setCode(digits);
    // ৬ অঙ্ক পূর্ণ হলে নিজে থেকেই যাচাই (কিবোর্ডের সাজেশন/অটোফিল থেকে এলেও)
    if (phone && digits.length === OTP_LENGTH) void verify(phone, digits);
  };

  const errorText = error ? <Text tone="danger">{t(`phoneLogin.error.${error}`)}</Text> : null;

  if (!phone) {
    return (
      <Card className="gap-3">
        <Text variant="heading">{t('phoneLogin.title')}</Text>
        <Text tone="muted">{t('phoneLogin.phoneHint')}</Text>
        <TextInput
          accessibilityLabel={t('phoneLogin.phoneLabel')}
          placeholder={t('phoneLogin.phonePlaceholder')}
          placeholderTextColor={colors['text-muted']}
          keyboardType="phone-pad"
          inputMode="tel"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={20}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submitPhone}
          style={inputStyle}
        />
        {errorText}
        <Button label={t('phoneLogin.sendCode')} loading={busy} onPress={submitPhone} />
      </Card>
    );
  }

  return (
    <Card className="gap-3">
      <Text variant="heading">{t('phoneLogin.codeTitle')}</Text>
      <Text tone="muted">{t('phoneLogin.codeSentTo', { phone: formatBdPhone(phone) })}</Text>
      <TextInput
        accessibilityLabel={t('phoneLogin.codeLabel')}
        placeholder={t('phoneLogin.codePlaceholder')}
        placeholderTextColor={colors['text-muted']}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={OTP_LENGTH}
        value={code}
        onChangeText={onCodeChange}
        onSubmitEditing={submitCode}
        style={{ ...inputStyle, letterSpacing: 6 }}
      />
      {errorText}
      <Button label={t('phoneLogin.verify')} loading={busy} onPress={submitCode} />
      <Button
        label={
          resendIn > 0 ? t('phoneLogin.resendIn', { seconds: resendIn }) : t('phoneLogin.resend')
        }
        variant="secondary"
        disabled={resendIn > 0 || busy}
        onPress={() => void send(phone)}
      />
      <Button
        label={t('phoneLogin.changeNumber')}
        variant="ghost"
        disabled={busy}
        onPress={() => {
          stopListening.current();
          lastSubmitted.current = '';
          setPhone(null);
          setError(null);
        }}
      />
    </Card>
  );
}
