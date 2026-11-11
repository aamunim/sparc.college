import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from './cn';
import { textVariants, type TextVariant } from './tokens';

export type TextTone = 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'on-primary';

const toneClass: Record<TextTone, string> = {
  default: 'text-text',
  muted: 'text-text-muted',
  primary: 'text-primary',
  danger: 'text-danger',
  success: 'text-success',
  'on-primary': 'text-on-primary',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
};

/** অ্যাপের সব লেখা এই Text দিয়ে — সঠিক ফন্ট, বাংলার উপযোগী lineHeight আর থিমের রং। */
export function Text({ variant = 'body', tone = 'default', className, style, ...rest }: TextProps) {
  const isArabic = variant === 'arabic';
  return (
    <RNText
      {...rest}
      className={cn(toneClass[tone], className)}
      style={[textVariants[variant], isArabic && { writingDirection: 'rtl' }, style]}
    />
  );
}
