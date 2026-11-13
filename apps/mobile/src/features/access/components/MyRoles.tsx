import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, Text } from '@/ui';

import { useMyAccess } from '../hooks';

const KNOWN_ROLES = [
  'platform_admin',
  'platform_support',
  'sparc_representative',
  'instructor',
  'teacher',
  'student',
  'parent',
  'researcher',
] as const;
type KnownRole = (typeof KNOWN_ROLES)[number];
const isKnownRole = (key: string): key is KnownRole =>
  (KNOWN_ROLES as readonly string[]).includes(key);

/** D19: প্রতিষ্ঠান একটাই (SPARC) — তাই শুধু নিজের ভূমিকাগুলো দেখানো হয়। */
export function MyRoles() {
  const { t } = useTranslation();
  const access = useMyAccess();

  if (access.isError) return <Text tone="danger">{t('access.loadFailed')}</Text>;
  if (!access.data) return <Text tone="muted">{t('common.loading')}</Text>;

  const keys = [...new Set(access.data.flatMap((a) => a.role_keys))];
  return (
    <Card className="gap-2">
      <Text variant="heading">{t('access.myRoles')}</Text>
      {keys.length === 0 ? (
        <Text tone="muted">{t('access.noRole')}</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {keys.map((key) => (
            <View key={key} className="rounded-full border border-border bg-surface-alt px-3 py-1">
              <Text variant="bodyStrong">{isKnownRole(key) ? t(`role.${key}`) : key}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
