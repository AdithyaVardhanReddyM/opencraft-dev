"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ScreenShape, ViewportState } from "@/types/canvas";
import { useSandboxResume } from "@/hooks/use-sandbox-resume";
import {
  DEVICE_PRESETS,
  getCurrentDevicePreset,
  TOOLBAR_HEIGHT,
  TOOLBAR_GAP,
  type DevicePreset,
} from "@/lib/canvas/toolbar-utils";
import {
  Monitor,
  ExternalLink,
  RefreshCw,
  Trash2,
  Loader2,
  ChevronDown,
  AlertCircle,
  Workflow,
  ArrowRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/canvas/ThemeSelector";

interface ScreenToolbarProps {
  shape: ScreenShape;
  screenData?: {
    _id: Id<"screens">;
    sandboxUrl?: string;
    sandboxId?: string;
    title?: string;
    theme?: string;
  };
  viewport: ViewportState;
  /** True while the AI agent is actively generating for this screen. */
  isGenerating?: boolean;
  onDelete: () => void;
  onResize: (width: number, height: number) => void;
  onRefresh: () => void;
  /** Create a connected flow page (new route in the same sandbox) from a prompt. */
  onCreateFlow: (prompt: string) => void;
}

export function ScreenToolbar({
  shape,
  screenData,
  viewport,
  isGenerating = false,
  onDelete,
  onResize,
  onRefresh,
  onCreateFlow,
}: ScreenToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(screenData?.title || "Untitled");
  const [isSaving, setIsSaving] = useState(false);

  // Device dropdown state
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);

  // Create-flow popover state
  const [isFlowPopoverOpen, setIsFlowPopoverOpen] = useState(false);
  const [flowPrompt, setFlowPrompt] = useState("");

  // Sandbox state
  const { status, resume } = useSandboxResume({
    sandboxId: screenData?.sandboxId,
    sandboxUrl: screenData?.sandboxUrl,
    autoResume: true,
  });

  // Convex mutation for updating screen
  const updateScreen = useMutation(api.screens.updateScreen);

  // Handle theme change - apply to sandbox and save to Convex
  const handleThemeChange = useCallback(
    async (themeId: string) => {
      if (!screenData?.sandboxId || !screenData?._id) return;

      // Call API to apply theme to sandbox
      const response = await fetch("/api/sandbox/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandboxId: screenData.sandboxId,
          themeId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to apply theme");
      }

      // Save theme to Convex
      await updateScreen({
        screenId: screenData._id,
        theme: themeId,
      });

      pendo.track("theme_changed", {
        screen_id: String(screenData._id),
        previous_theme: screenData.theme || "default",
        new_theme: themeId,
        sandbox_id: screenData.sandboxId || "",
      });

      // Refresh the iframe to show new theme
      onRefresh();
    },
    [screenData, updateScreen, onRefresh]
  );

  // Sync edited name with screen data
  useEffect(() => {
    if (!isEditingName) {
      setEditedName(screenData?.title || "Untitled");
    }
  }, [screenData?.title, isEditingName]);

  // Get current device preset
  const currentPreset = getCurrentDevicePreset(shape);

  // Handle name save
  const handleNameSave = useCallback(async () => {
    const trimmedName = editedName.trim();

    // Validate: prevent empty names
    if (!trimmedName) {
      setEditedName(screenData?.title || "Untitled");
      setIsEditingName(false);
      return;
    }

    // Skip if name hasn't changed
    if (trimmedName === screenData?.title) {
      setIsEditingName(false);
      return;
    }

    // Save to Convex
    if (screenData?._id) {
      setIsSaving(true);
      try {
        await updateScreen({
          screenId: screenData._id,
          title: trimmedName,
        });

        pendo.track("screen_renamed", {
          screen_id: String(screenData._id),
          new_title: trimmedName,
          previous_title: screenData.title || "Untitled",
        });
      } catch (error) {
        console.error("Failed to save screen name:", error);
        setEditedName(screenData?.title || "Untitled");
      } finally {
        setIsSaving(false);
      }
    }

    setIsEditingName(false);
  }, [editedName, screenData, updateScreen]);

  // Handle name input key down
  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleNameSave();
      } else if (e.key === "Escape") {
        setEditedName(screenData?.title || "Untitled");
        setIsEditingName(false);
      }
    },
    [handleNameSave, screenData?.title]
  );

  // Handle device preset selection
  const handleDeviceSelect = useCallback(
    (preset: DevicePreset) => {
      onResize(preset.width, preset.height);
      setIsDeviceDropdownOpen(false);

      pendo.track("screen_device_resized", {
        screen_id: screenData?._id ? String(screenData._id) : "",
        device_preset_id: preset.id,
        device_preset_label: preset.label,
        width: preset.width,
        height: preset.height,
      });
    },
    [onResize, screenData]
  );

  // Handle preview click
  const handlePreview = useCallback(async () => {
    if (status === "expired" || status === "idle") return;

    if (status === "ready" && screenData?.sandboxUrl) {
      pendo.track("screen_previewed", {
        screen_id: screenData._id ? String(screenData._id) : "",
        sandbox_url: screenData.sandboxUrl,
      });
      window.open(screenData.sandboxUrl, "_blank");
      return;
    }

    // If resuming or checking, wait for ready
    if (status === "resuming" || status === "checking") {
      // The hook will auto-resume, we just need to wait
      return;
    }

    // If paused/error, try to resume first
    await resume();
    if (screenData?.sandboxUrl) {
      window.open(screenData.sandboxUrl, "_blank");
    }
  }, [status, screenData?.sandboxUrl, resume]);

  // Handle create-flow submit
  const handleFlowSubmit = useCallback(() => {
    const trimmed = flowPrompt.trim();
    if (!trimmed) return;

    onCreateFlow(trimmed);

    pendo.track("flow_created", {
      parent_screen_id: screenData?._id ? String(screenData._id) : "",
      sandbox_id: screenData?.sandboxId || "",
      prompt_length: trimmed.length,
    });

    setFlowPrompt("");
    setIsFlowPopoverOpen(false);
  }, [flowPrompt, onCreateFlow, screenData]);

  const handleFlowKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleFlowSubmit();
      } else if (e.key === "Escape") {
        setIsFlowPopoverOpen(false);
      }
    },
    [handleFlowSubmit]
  );

  // Determine button states
  const isLoading = status === "resuming" || status === "checking";
  const isExpired = status === "expired";
  const isError = status === "error";
  const isIdle = status === "idle" && !screenData?.sandboxId;
  const canPreview = status === "ready" && !!screenData?.sandboxUrl;
  const canRefresh = status === "ready";
  // A flow child reuses this screen's sandbox, so it can only be created once the
  // sandbox is ready and has an id to copy.
  const canCreateFlow =
    canPreview && !!screenData?._id && !!screenData?.sandboxId;

  // Get preview tooltip text
  const getPreviewTooltip = () => {
    if (isExpired) return "Sandbox expired";
    if (isIdle) return "No preview available";
    if (isLoading) return "Resuming sandbox...";
    return "Open in new tab";
  };

  // Get refresh tooltip text
  const getRefreshTooltip = () => {
    if (!canRefresh) return "Sandbox not ready";
    return "Refresh preview";
  };

  // Get current device icon
  const DeviceIcon = currentPreset?.icon || Monitor;

  // Calculate inverse scale to keep toolbar at consistent size
  const inverseScale = 1 / viewport.scale;

  // Position toolbar centered above the shape
  // We position at shape center X, and above shape Y
  const toolbarX = shape.x + shape.w / 2;
  const toolbarY = shape.y - TOOLBAR_GAP / viewport.scale;

  return (
    <div
      ref={toolbarRef}
      className="absolute flex items-center gap-0.5 px-1.5 py-1 bg-card/95 rounded-lg backdrop-blur-2xl saturate-150"
      style={{
        left: toolbarX,
        top: toolbarY,
        minHeight: TOOLBAR_HEIGHT,
        transform: `translate(-50%, -100%) scale(${inverseScale})`,
        transformOrigin: "center bottom",
        boxShadow:
          "0 4px 24px -4px oklch(0 0 0 / 0.5), 0 8px 16px -8px oklch(0 0 0 / 0.3)",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Device Preset Dropdown */}
      <Popover
        open={isDeviceDropdownOpen}
        onOpenChange={setIsDeviceDropdownOpen}
      >
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1 h-8 px-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-foreground"
            aria-label="Change device size"
          >
            <DeviceIcon className="w-4 h-4" />
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start" sideOffset={8}>
          {DEVICE_PRESETS.map((preset) => {
            const PresetIcon = preset.icon;
            const isActive = currentPreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                className={cn(
                  "flex items-center gap-3 w-full px-2.5 py-2 rounded-md text-left transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => handleDeviceSelect(preset)}
              >
                <PresetIcon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.width} × {preset.height}
                  </div>
                </div>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Theme Selector */}
      <ThemeSelector
        currentTheme={screenData?.theme || "default"}
        onThemeChange={handleThemeChange}
        disabled={!canRefresh}
      />

      {/* Divider */}
      <div className="h-5 w-px bg-border/50 mx-1" aria-hidden />

      {/* Screen Name Input */}
      <div className="flex-1 min-w-[120px] max-w-[200px]">
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className="w-full h-8 px-2 text-sm bg-accent rounded-md border-none outline-none focus:ring-2 focus:ring-primary text-foreground"
            autoFocus
          />
        ) : (
          <button
            className="w-full h-8 px-2 text-sm text-left text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors truncate"
            onClick={() => setIsEditingName(true)}
          >
            {isSaving ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            ) : (
              screenData?.title || "Untitled"
            )}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border/50 mx-1" aria-hidden />

      {/* Action Buttons */}
      {isLoading ? (
        <div className="flex items-center gap-2 px-2 h-8">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Resuming...</span>
        </div>
      ) : isExpired ? (
        <div className="flex items-center gap-2 px-2 h-8">
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs text-muted-foreground">Expired</span>
        </div>
      ) : isError ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center gap-1 h-8 px-2 rounded-md text-destructive hover:bg-accent transition-colors"
              onClick={resume}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-xs">Retry</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Resume sandbox</TooltipContent>
        </Tooltip>
      ) : (
        <>
          {/* Preview Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  canPreview
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-muted-foreground/40 cursor-not-allowed"
                )}
                onClick={handlePreview}
                disabled={!canPreview && !isLoading}
                aria-label="Preview in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{getPreviewTooltip()}</TooltipContent>
          </Tooltip>

          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  canRefresh
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-muted-foreground/40 cursor-not-allowed"
                )}
                onClick={onRefresh}
                disabled={!canRefresh}
                aria-label="Refresh preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{getRefreshTooltip()}</TooltipContent>
          </Tooltip>

          {/* Create Flow Button — connects a new page (route) built in this same
              sandbox. Requires a ready sandbox the child can reuse. */}
          <Popover
            open={isFlowPopoverOpen}
            onOpenChange={(open) => {
              if (open && (!canCreateFlow || isGenerating)) return;
              setIsFlowPopoverOpen(open);
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      canCreateFlow && !isGenerating
                        ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                        : "text-muted-foreground/40 cursor-not-allowed"
                    )}
                    disabled={!canCreateFlow || isGenerating}
                    aria-label="Create flow"
                  >
                    <Workflow className="w-3.5 h-3.5" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                {isGenerating
                  ? "Generating…"
                  : canCreateFlow
                    ? "Create flow"
                    : "Generate this screen first"}
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 p-2" align="center" sideOffset={8}>
              <div className="flex flex-col gap-2">
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  Connect a new page in this flow
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={flowPrompt}
                    onChange={(e) => setFlowPrompt(e.target.value)}
                    onKeyDown={handleFlowKeyDown}
                    placeholder="Describe the next screen, e.g. checkout page"
                    className="flex-1 h-9 px-2.5 text-sm bg-accent rounded-md border-none outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <button
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                      flowPrompt.trim()
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                    )}
                    onClick={handleFlowSubmit}
                    disabled={!flowPrompt.trim()}
                    aria-label="Create flow"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Divider */}
      <div className="h-5 w-px bg-border/50 mx-1" aria-hidden />

      {/* Delete Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={onDelete}
            aria-label="Delete screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Delete screen</TooltipContent>
      </Tooltip>
    </div>
  );
}
