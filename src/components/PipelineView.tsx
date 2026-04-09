import { useState, useEffect, useMemo, memo } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { pipelineApi, leadApi } from '../lib/api';
import { Loader2, TrendingUp, DollarSign, Target } from 'lucide-react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DropAnimation,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

interface PipelineViewProps {
  leadTypeId?: number;
}

interface Lead {
  id: number;
  title: string;
  companyName?: string;
  dealValue?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  sales_stage_id: number;
  // Add other properties as needed
}

interface PipelineStage {
  stage: {
    id: number;
    name: string;
    probability: number;
  };
  leads: Lead[];
  totalValue: number;
  weightedValue: number;
}

// Sortable Deal Card Component - Memoized for performance
const SortableDealCard = memo(({ lead }: { lead: Lead }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: 'Lead',
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-gray-100 rounded-lg p-3 h-[100px] border-2 border-dashed border-indigo-300"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing bg-white group border-gray-100"
    >
      <div className="font-medium text-sm mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">{lead.title}</div>
      <div className="text-xs text-muted-foreground mb-2 truncate">
        {lead.companyName || 'No Company'}
      </div>
      <div className="flex items-center justify-between mt-2">
        {lead.dealValue ? (
          <div className="text-sm font-bold text-gray-900">
            {lead.currency || '₹'}{lead.dealValue.toLocaleString()}
          </div>
        ) : <div />}
        {lead.probability !== undefined && (
          <Badge variant="secondary" className="text-xs px-1 h-5 bg-indigo-50 text-indigo-700 border-none">{lead.probability}%</Badge>
        )}
      </div>
      {lead.expectedCloseDate && (
        <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500 flex items-center gap-1">
          <Target className="w-3 h-3" />
          {new Date(lead.expectedCloseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}
    </Card>
  );
});

// Droppable Column Component - Memoized for performance
const PipelineColumn = memo(({ stageId, stageData }: { stageId: string, stageData: PipelineStage }) => {
  const { stage, leads, totalValue, weightedValue } = stageData;

  const { setNodeRef } = useDroppable({
    id: stageId,
    data: {
      type: 'Column',
      stage,
    },
  });

  return (
    <div className="flex-shrink-0 w-80 flex flex-col h-full max-h-full">
      <div ref={setNodeRef} className="h-full flex flex-col bg-gray-100/50 rounded-xl border border-gray-200 shadow-none overflow-hidden">
        {/* Column Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              {stage.name}
              <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {leads.length}
              </span>
            </h3>
            <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              {stage.probability}%
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1" title="Total Value">
              <DollarSign className="w-3 h-3" />
              <span className="font-semibold text-gray-600">₹{((stageData.totalValue || 0) / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex items-center gap-1" title="Weighted Value">
              <TrendingUp className="w-3 h-3" />
              <span className="font-semibold text-gray-600">₹{((weightedValue || 0) / 100000).toFixed(1)}L</span>
            </div>
          </div>
        </div>

        {/* Sortable Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          <SortableContext
            items={leads.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.map((lead) => (
              <SortableDealCard key={lead.id} lead={lead} />
            ))}
          </SortableContext>
          {leads.length === 0 && (
            <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-500 text-xs gap-2 bg-white/50">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                <Target className="w-4 h-4 opacity-20" />
              </div>
              No leads in this stage
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export function PipelineView({ leadTypeId }: PipelineViewProps) {
  const [pipeline, setPipeline] = useState<Record<string, PipelineStage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require 5px movement to start drag (prevents accidental clicks)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchPipeline();
  }, [leadTypeId]);

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      const response = await pipelineApi.getPipeline(leadTypeId);
      if (response.success && response.data) {
        setPipeline(response.data);
      } else {
        setError(response.error || 'Failed to load pipeline');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  };

  // Find the lead object by ID across all stages
  const activeLead = useMemo(() => {
    if (!activeDragId) return null;
    for (const stageName in pipeline) {
      const found = pipeline[stageName].leads.find(l => l.id === activeDragId);
      if (found) return found;
    }
    return null;
  }, [activeDragId, pipeline]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Find source and destination containers
    // This part is for optimistic updates during drag, but for simple columns we can rely on dragEnd
    // Implementing full sortable grid logic is complex, sticking to simple move-on-drop for MVP
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const activeId = active.id as number;
    // The over.id will be the column ID (stage name) IF dropped on the column container
    // OR it could be another item ID if dropped on an item.

    // We need to resolve the destination stage
    let destinationStageName: string | null = null;

    // Check if over is a container (stage)
    if (pipeline[over.id]) {
      destinationStageName = over.id as string;
    } else {
      // It might be dropped over another item -> find that item's stage
      for (const [sName, sData] of Object.entries(pipeline)) {
        if (sData.leads.some(l => l.id === over.id)) {
          destinationStageName = sName;
          break;
        }
      }
    }

    if (!destinationStageName) return;

    // Find source stage
    let sourceStageName: string | null = null;
    let movedLead: Lead | null = null;

    for (const [sName, sData] of Object.entries(pipeline)) {
      const lead = sData.leads.find(l => l.id === activeId);
      if (lead) {
        sourceStageName = sName;
        movedLead = lead;
        break;
      }
    }

    if (!sourceStageName || !movedLead || sourceStageName === destinationStageName) return;

    // Optimistic Update
    const newPipeline = { ...pipeline };

    // Remove from source
    newPipeline[sourceStageName] = {
      ...newPipeline[sourceStageName],
      leads: newPipeline[sourceStageName].leads.filter(l => l.id !== activeId),
      // Update totals roughly (optional)
    };

    // Add to destination
    const destinationStageData = newPipeline[destinationStageName];
    // Update the sales_stage_id of the lead
    const updatedLead = { ...movedLead, sales_stage_id: destinationStageData.stage.id };

    newPipeline[destinationStageName] = {
      ...destinationStageData,
      leads: [...destinationStageData.leads, updatedLead]
    };

    setPipeline(newPipeline);

    // Call API
    try {
      const destinationStageId = destinationStageData.stage.id;
      await leadApi.updateStage(activeId, destinationStageId);
    } catch (error) {
      console.error("Failed to update stage:", error);
      // Revert on failure
      fetchPipeline();
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  const stages = Object.keys(pipeline);

  if (loading) {
    return (
      <div className="h-full flex flex-col p-6 overflow-hidden">
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded"></div>
        </div>
        <div className="flex gap-4 h-full overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-80 bg-gray-50/50 rounded-xl border border-gray-100 h-full flex flex-col p-4 gap-4 animate-pulse">
              <div className="h-12 bg-gray-200/50 rounded-lg"></div>
              <div className="h-24 bg-white rounded-xl border border-gray-100"></div>
              <div className="h-24 bg-white rounded-xl border border-gray-100"></div>
              <div className="h-24 bg-white rounded-xl border border-gray-100"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <p className="text-lg text-red-600 mb-4">{error}</p>
        <Button onClick={fetchPipeline}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold">Sales Pipeline</h1>
        <p className="text-muted-foreground">Manage your leads through the sales stages</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full min-w-max pb-4">
            {stages.map((stageName) => (
              <PipelineColumn
                key={stageName}
                stageId={stageName}
                stageData={pipeline[stageName]}
              />
            ))}
          </div>
        </div>

        {createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeLead ? (
              <div className="w-80">
                <Card className="p-3 shadow-xl bg-white ring-2 ring-indigo-500 rotate-2 cursor-grabbing">
                  <div className="font-medium text-sm mb-1">{activeLead.title}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {activeLead.companyName || 'No Company'}
                  </div>
                  {activeLead.dealValue && (
                    <div className="text-sm font-semibold text-green-600">
                      {activeLead.currency || 'INR'} {activeLead.dealValue.toLocaleString()}
                    </div>
                  )}
                </Card>
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}


