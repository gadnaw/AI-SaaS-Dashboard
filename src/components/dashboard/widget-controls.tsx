'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WidgetControlsProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function WidgetControls({ isVisible, onToggleVisibility }: WidgetControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleVisibility}
        className={cn(
          'h-8 w-8 transition-all',
          isVisible ? 'text-muted-foreground hover:text-foreground' : 'text-primary bg-primary/10'
        )}
        title={isVisible ? 'Hide widget' : 'Show widget'}
      >
        {isVisible ? (
          <Eye className="w-4 h-4" />
        ) : (
          <EyeOff className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
