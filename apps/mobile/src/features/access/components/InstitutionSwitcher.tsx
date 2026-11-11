import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Card, Text } from '@/ui';

import {
  useActiveInstitution,
  useMyAccess,
  useMyInstitutions,
  useSwitchInstitution,
} from '../hooks';

/** একাধিক প্রতিষ্ঠানের সদস্য হলে বদলানোর বোতাম (D4: একজন মানুষ, অনেক প্রতিষ্ঠান) */
export function InstitutionSwitcher() {
  const { t, i18n } = useTranslation();
  const access = useMyAccess();
  const institutions = useMyInstitutions();
  const active = useActiveInstitution();
  const switchTo = useSwitchInstitution();

  if (access.isError || institutions.isError) {
    return <Text tone="danger">{t('access.loadFailed')}</Text>;
  }
  if (!access.data || !institutions.data) {
    return <Text tone="muted">{t('common.loading')}</Text>;
  }
  if (access.data.length === 0) {
    return <Text tone="muted">{t('access.noMembership')}</Text>;
  }

  const nameOf = (id: string) => {
    const inst = institutions.data.find((i) => i.id === id);
    if (!inst) return id;
    return i18n.language === 'bn' && inst.name_bn ? inst.name_bn : inst.name;
  };

  return (
    <Card className="gap-3">
      <Text variant="heading">{t('access.institution')}</Text>
      <View className="flex-row flex-wrap gap-3">
        {access.data.map((a) => (
          <Button
            key={a.institution_id}
            label={nameOf(a.institution_id)}
            variant={a.institution_id === active ? 'primary' : 'secondary'}
            accessibilityState={{ selected: a.institution_id === active }}
            onPress={() => switchTo(a.institution_id)}
          />
        ))}
      </View>
    </Card>
  );
}
