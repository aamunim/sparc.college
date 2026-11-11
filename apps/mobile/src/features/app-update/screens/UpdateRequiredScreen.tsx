import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { Button, Card, Screen, Text } from '@/ui';

import type { VersionPolicyFull } from '../api';

export function UpdateRequiredScreen({ policy }: { policy: VersionPolicyFull | null }) {
  const { t, i18n } = useTranslation();
  const custom = i18n.language === 'bn' ? policy?.message_bn : policy?.message_en;
  return (
    <Screen scroll={false} className="flex-1 justify-center">
      <Card className="gap-3">
        <Text variant="title">{t('update.title')}</Text>
        <Text>{custom || t('update.body')}</Text>
        {policy?.store_url ? (
          <Button
            label={t('update.button')}
            onPress={() => Linking.openURL(policy.store_url ?? '')}
          />
        ) : null}
      </Card>
    </Screen>
  );
}
