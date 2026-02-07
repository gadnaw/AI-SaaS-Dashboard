'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { createClient } from '@/lib/supabase/client';
import { WidgetItem } from './widget-item';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Widget {
  id: string;
  title: string;
  order: number;
  isVisible: boolean;
}

interface WidgetGridProps {
  tenantId: string;
  userId?: string;
  defaultWidgets: Array<{
    id: string;
    title: string;
    component: React.ReactNode;
  }>;
}

export function WidgetGrid({ tenantId, userId, defaultWidgets }: WidgetGridProps) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Initialize with default widgets
  useEffect(() => {
    const initialWidgets: Widget[] = defaultWidgets.map((widget, index) => ({
      id: widget.id,
      title: widget.title,
      order: index,
      isVisible: true,
    }));
    setWidgets(initialWidgets);
  }, [defaultWidgets]);

  // Load saved layout from Supabase
  useEffect(() => {
    const loadLayout = async () => {
      try {
        let query = supabase
          .from('widget_layouts')
          .select('*')
          .eq('tenant_id', tenantId);

        if (userId) {
          query = query.eq('user_id', userId);
        } else {
          query = query.is('user_id', null);
        }

        const { data, error } = await query.order('widget_order').single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned (first time user)
          throw error;
        }

        if (data) {
          // Apply saved layout
          const savedWidgets: Record<string, { order: number; isVisible: boolean }> = {};
          
          // Parse layout if it's JSON
          const layout = typeof data.layout === 'string' 
            ? JSON.parse(data.layout) 
            : data.layout;
          
          if (Array.isArray(layout)) {
            layout.forEach((item: { widget_id: string; order: number; visible: boolean }) => {
              savedWidgets[item.widget_id] = {
                order: item.order,
                isVisible: item.visible,
              };
            });
          }

          setWidgets(prev => {
            // Merge saved layout with defaults
            return prev.map(widget => ({
              ...widget,
              order: savedWidgets[widget.id]?.order ?? widget.order,
              isVisible: savedWidgets[widget.id]?.isVisible ?? widget.isVisible,
            })).sort((a, b) => a.order - b.order);
          });
        }
      } catch (error) {
        console.error('Error loading widget layout:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLayout();
  }, [tenantId, userId, supabase]);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    setWidgets((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(items, oldIndex, newIndex);
      
      // Update order values
      const updatedOrder = newOrder.map((item, index) => ({
        ...item,
        order: index,
      }));

      // Persist to Supabase
      persistLayout(updatedOrder);

      return updatedOrder;
    });

    setActiveId(null);
  }, [supabase, tenantId, userId]);

  // Persist layout to Supabase
  const persistLayout = async (widgets: Widget[]) => {
    try {
      const layout = widgets.map((widget) => ({
        widget_id: widget.id,
        order: widget.order,
        visible: widget.isVisible,
      }));

      const payload = {
        tenant_id: tenantId,
        user_id: userId || null,
        layout: layout,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('widget_layouts')
        .upsert(payload, {
          onConflict: 'tenant_id,user_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast.success('Widget layout saved');
    } catch (error) {
      console.error('Error saving widget layout:', error);
      toast.error('Failed to save widget layout');
    }
  };

  // Toggle visibility
  const handleToggleVisibility = useCallback((widgetId: string) => {
    setWidgets((prev) => {
      const updated = prev.map((widget) =>
        widget.id === widgetId
          ? { ...widget, isVisible: !widget.isVisible }
          : widget
      );

      // Persist change
      persistLayout(updated);

      return updated;
    });
  }, [supabase, tenantId, userId]);

  // Find active widget for drag overlay
  const activeWidget = activeId
    ? widgets.find((w) => w.id === activeId)
    : null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {defaultWidgets.slice(0, 2).map((widget) => (
          <div key={widget.id} className="bg-card rounded-xl border shadow-sm p-4 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4" />
            <div className="h-32 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {widgets.map((widget) => {
              const widgetComponent = defaultWidgets.find((w) => w.id === widget.id);
              
              return (
                <WidgetItem
                  key={widget.id}
                  id={widget.id}
                  title={widget.title}
                  isVisible={widget.isVisible}
                  onToggleVisibility={() => handleToggleVisibility(widget.id)}
                >
                  {widgetComponent?.component || (
                    <div className="p-4 text-center text-muted-foreground">
                      Widget content not available
                    </div>
                  )}
                </WidgetItem>
              );
            })}
          </AnimatePresence>
        </div>
      </SortableContext>

      <DragOverlay>
        {activeWidget && (
          <div className="opacity-80 rotate-3 scale-105">
            <div className="bg-card rounded-xl border shadow-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">{activeWidget.title}</h3>
              </div>
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
