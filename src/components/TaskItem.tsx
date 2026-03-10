"use client"

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useFoco, DailyDirective } from "@/lib/store";

interface TaskItemProps {
  assetId: string;
  task: DailyDirective;
}

export function TaskItem({ assetId, task }: TaskItemProps) {
  const { toggleTask } = useFoco();

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
      task.completed 
        ? "bg-secondary/30 opacity-60" 
        : "bg-white hover:shadow-lg hover:shadow-black/5 active:scale-[0.98]"
    )}>
      <Checkbox
        id={task.id}
        checked={task.completed}
        onCheckedChange={() => toggleTask(assetId, task.id)}
        className="w-6 h-6 rounded-full border-2 border-muted transition-all data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:animate-check-bounce"
      />
      <label
        htmlFor={task.id}
        className={cn(
          "text-sm font-semibold cursor-pointer transition-all leading-tight",
          task.completed ? "text-muted-foreground line-through" : "text-foreground"
        )}
      >
        {task.title}
      </label>
    </div>
  );
}