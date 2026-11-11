import { View, type ViewProps } from 'react-native';

import { cn } from './cn';

export type CardProps = ViewProps & { className?: string };

export function Card({ className, ...rest }: CardProps) {
  return (
    <View {...rest} className={cn('rounded-xl border border-border bg-surface p-4', className)} />
  );
}
