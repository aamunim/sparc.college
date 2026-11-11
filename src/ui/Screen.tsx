import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from './cn';

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
};

/** প্রতিটা স্ক্রিনের মূল কাঠামো: safe area (Android edge-to-edge), থিমের পটভূমি, ১৬px পাশের ফাঁক। */
export function Screen({ children, scroll = true, className }: ScreenProps) {
  const content = (
    <View className={cn('w-full max-w-2xl self-center gap-4 px-4 py-6', className)}>
      {children}
    </View>
  );
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerClassName="grow" keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
