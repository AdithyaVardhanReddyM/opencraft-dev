"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { THEMES } from "@/lib/canvas/theme-utils";
import { DesignSystemRail } from "@/components/canvas/design-systems/DesignSystemRail";
import { DesignSystemDetail } from "@/components/canvas/design-systems/DesignSystemDetail";
import { CreateDesignSystemPanel } from "@/components/canvas/design-systems/CreateDesignSystemPanel";

type Mode = "light" | "dark";

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border p-0.5">
      {(["light", "dark"] as const).map((m) => {
        const Icon = m === "light" ? Sun : Moon;
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={cn(
              "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium capitalize transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {m}
          </button>
        );
      })}
    </div>
  );
}

interface DesignSystemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DesignSystemsModal({
  open,
  onOpenChange,
}: DesignSystemsModalProps) {
  const [selectedId, setSelectedId] = React.useState<string>(
    THEMES[0]?.id ?? "default"
  );
  const [mode, setMode] = React.useState<Mode>("light");
  const [isCreate, setIsCreate] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]">
        <DialogHeader className="space-y-0 border-b px-5 py-3 text-left">
          <div className="flex items-center justify-between gap-3 pr-10">
            <div className="space-y-0.5">
              <DialogTitle className="text-base">Design systems</DialogTitle>
              <DialogDescription className="text-xs">
                Preview the presets, or create your own from a website or CSS.
              </DialogDescription>
            </div>
            {!isCreate && <ModeToggle mode={mode} onModeChange={setMode} />}
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <DesignSystemRail
            selectedId={selectedId}
            isCreate={isCreate}
            onSelect={(id) => {
              setSelectedId(id);
              setIsCreate(false);
            }}
            onSelectCreate={() => setIsCreate(true)}
          />
          <div className="min-w-0 flex-1">
            {isCreate ? (
              <CreateDesignSystemPanel
                onCreated={(id) => {
                  setSelectedId(id);
                  setIsCreate(false);
                }}
              />
            ) : (
              <DesignSystemDetail themeId={selectedId} mode={mode} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
