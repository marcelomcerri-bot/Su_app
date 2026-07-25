import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';

interface SpinnerProps extends React.ComponentProps<'svg'> {
  size?: string | number;
}

function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      size={size}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
