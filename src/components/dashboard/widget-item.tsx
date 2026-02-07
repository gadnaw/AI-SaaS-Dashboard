'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetControls } from './widget-controls';

interface WidgetItemProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function WidgetItem({ 
  id, 
  title, 
  children, 
  isVisible,
  onToggleVisibility 
}: WidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card rounded-xl border shadow-sm overflow-hidden transition-all',
        isDragging && 'opacity-50 shadow-lg scale-105 z-50',
        !isVisible && 'opacity-50'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <h3 className="font-semibold">{title}</h3>
        </div>
        
        <WidgetControls
          isVisible={isVisible}
          onToggleVisibility={onToggleVisibility}
        />
      </div>

      {/* Widget Content */}
      <div className={cn(!isVisible && 'hidden')}>
        {children}
      </div>

      {/* Hidden Overlay */}
      {!isVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm">{title} hidden</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
