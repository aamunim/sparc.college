import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { cn } from './cn';
import { Text, type TextTone } from './Text';
import { useAppTheme } from './theme';
import { MIN_TOUCH_SIZE } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const containerClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary border-primary',
  secondary: 'bg-surface border-border',
  ghost: 'bg-transparent border-transparent',
  danger: 'bg-danger border-danger',
};

const labelTone: Record<ButtonVariant, TextTone> = {
  primary: 'on-primary',
  secondary: 'default',
  ghost: 'primary',
  danger: 'on-primary',
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  fullWidth = false,
  className,
  ...rest
}: ButtonProps) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;
  const tone = variant === 'danger' ? 'on-primary' : labelTone[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={8}
      style={{ minHeight: MIN_TOUCH_SIZE }}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-lg border px-5',
        containerClass[variant],
        fullWidth && 'self-stretch',
        isDisabled && 'opacity-50',
        className,
      )}
      {...rest}>
      {loading && (
        <ActivityIndicator
          color={
            variant === 'secondary' || variant === 'ghost' ? colors.primary : colors['on-primary']
          }
        />
      )}
      <Text variant="bodyStrong" tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
}
