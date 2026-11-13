import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from './cn';

/** ফোকাস করা ফিল্ড আর কিবোর্ডের মাঝে ফাঁকা জায়গা (নিচের বোতাম/এরর লেখা দেখা যায়) */
const KEYBOARD_GAP = 96;

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
        // কিবোর্ড খুললে ফোকাস করা টেক্সট ফিল্ড (আর তার নিচের বোতামের জায়গা) দেখা যায় এমনভাবে স্ক্রল করে
        <KeyboardAwareScrollView
          contentContainerClassName="grow"
          keyboardShouldPersistTaps="handled"
          bottomOffset={KEYBOARD_GAP}>
          {content}
        </KeyboardAwareScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
