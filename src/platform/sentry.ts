// ক্র্যাশ রিপোর্টিং (§১২.৬)। DSN না থাকলে বা ডেভেলপমেন্টে বন্ধ।
// ব্যক্তিগত তথ্য যাবে না: sendDefaultPii বন্ধ, ইউজারের শুধু id, লেখা থেকে ফোন/ইমেইল/টোকেন ঢাকা,
// সেশন রিপ্লে নেই (শিশু ব্যবহারকারী)।
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

import { redactText, redactValue } from '@/core/redact';

import { appConfig } from './env';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  initialized = true;
  const enabled = Boolean(appConfig.sentryDsn) && !__DEV__;

  Sentry.init({
    dsn: appConfig.sentryDsn,
    enabled,
    environment: appConfig.appEnv,
    sendDefaultPii: false,
    tracesSampleRate: appConfig.appEnv === 'prod' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.user) event.user = event.user.id ? { id: String(event.user.id) } : undefined;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      if (event.message) event.message = redactText(event.message);
      for (const ex of event.exception?.values ?? []) {
        if (ex.value) ex.value = redactText(ex.value);
      }
      if (event.extra) event.extra = redactValue(event.extra);
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) breadcrumb.message = redactText(breadcrumb.message);
      if (breadcrumb.data) breadcrumb.data = redactValue(breadcrumb.data);
      return breadcrumb;
    },
  });

  // কোন OTA আপডেট/চ্যানেলে ক্র্যাশ হচ্ছে তা বোঝার জন্য (§২০.১২)
  const scope = Sentry.getGlobalScope();
  scope.setTag('app_env', appConfig.appEnv);
  scope.setTag('expo_update_id', Updates.updateId ?? 'none');
  scope.setTag('expo_channel', Updates.channel ?? 'none');
  scope.setTag('expo_runtime_version', Updates.runtimeVersion ?? 'none');
  scope.setTag('expo_embedded_launch', String(Updates.isEmbeddedLaunch));
}

/** লগইনের পর শুধু UUID — নাম, ফোন বা ইমেইল কখনো নয়। */
export function setSentryUser(userId: string | null): void {
  Sentry.setUser(userId ? { id: userId } : null);
}

export const wrapWithSentry = Sentry.wrap;
