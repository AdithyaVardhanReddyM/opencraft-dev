"use client";

import { useState } from "react";
import {
  Type,
  Layout,
  Palette,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { SelectedElementInfo, StyleChanges } from "@/lib/edit-mode/types";

// ============================================================================
// Types
// ============================================================================

interface ElementPropertiesPanelProps {
  element: SelectedElementInfo;
  pendingChanges: StyleChanges | null;
  onStyleChange: (property: string, value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// ============================================================================
// Collapsible Section
// ============================================================================

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {icon}
        {title}
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

// ============================================================================
// Property Row
// ============================================================================

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground w-20 shrink-0">
        {label}
      </Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ============================================================================
// Color Input
// ============================================================================

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // Convert rgb to hex for the color input
  const hexValue = value.startsWith("rgb")
    ? rgbToHex(value)
    : value.startsWith("#")
    ? value
    : "#000000";

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hexValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-border cursor-pointer"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs flex-1"
      />
    </div>
  );
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "#000000";
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ============================================================================
// Main Component
// ============================================================================

export function ElementPropertiesPanel({
  element,
  pendingChanges,
  onStyleChange,
  onSave,
  onDiscard,
  isSaving,
  hasUnsavedChanges,
}: ElementPropertiesPanelProps) {
  const { computedStyles, tagName, className, elementPath, sourceFile } =
    element;

  // Get current value (pending change or computed)
  const getValue = (property: keyof typeof computedStyles): string => {
    if (pendingChanges && property in pendingChanges) {
      return pendingChanges[property];
    }
    return computedStyles[property] || "";
  };

  // Parse numeric value from CSS string
  const parseNumeric = (value: string): number => {
    const match = value.match(/^(-?\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-mono bg-muted/50 rounded">
            {tagName}
          </span>
          {hasUnsavedChanges && (
            <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded">
              Modified
            </span>
          )}
        </div>
        {className && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            {className}
          </p>
        )}
        {sourceFile && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <FileCode className="h-3 w-3" />
            <span className="truncate">{sourceFile}</span>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Typography Section */}
        <Section
          title="Typography"
          icon={<Type className="h-3 w-3" />}
          defaultOpen={true}
        >
          <PropertyRow label="Font Size">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={parseNumeric(getValue("fontSize"))}
                onChange={(e) =>
                  onStyleChange("fontSize", `${e.target.value}px`)
                }
                className="h-7 text-xs w-16"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </PropertyRow>

          <PropertyRow label="Weight">
            <Select
              value={getValue("fontWeight")}
              onValueChange={(value) => onStyleChange("fontWeight", value)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">Thin (100)</SelectItem>
                <SelectItem value="200">Extra Light (200)</SelectItem>
                <SelectItem value="300">Light (300)</SelectItem>
                <SelectItem value="400">Normal (400)</SelectItem>
                <SelectItem value="500">Medium (500)</SelectItem>
                <SelectItem value="600">Semibold (600)</SelectItem>
                <SelectItem value="700">Bold (700)</SelectItem>
                <SelectItem value="800">Extra Bold (800)</SelectItem>
                <SelectItem value="900">Black (900)</SelectItem>
              </SelectContent>
            </Select>
          </PropertyRow>

          <PropertyRow label="Color">
            <ColorInput
              value={getValue("color")}
              onChange={(value) => onStyleChange("color", value)}
            />
          </PropertyRow>

          <PropertyRow label="Align">
            <Select
              value={getValue("textAlign")}
              onValueChange={(value) => onStyleChange("textAlign", value)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="justify">Justify</SelectItem>
              </SelectContent>
            </Select>
          </PropertyRow>
        </Section>

        {/* Layout Section */}
        <Section
          title="Layout"
          icon={<Layout className="h-3 w-3" />}
          defaultOpen={true}
        >
          <PropertyRow label="Width">
            <Input
              value={getValue("width")}
              onChange={(e) => onStyleChange("width", e.target.value)}
              className="h-7 text-xs"
              placeholder="auto"
            />
          </PropertyRow>

          <PropertyRow label="Height">
            <Input
              value={getValue("height")}
              onChange={(e) => onStyleChange("height", e.target.value)}
              className="h-7 text-xs"
              placeholder="auto"
            />
          </PropertyRow>

          <PropertyRow label="Display">
            <Select
              value={getValue("display")}
              onValueChange={(value) => onStyleChange("display", value)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="inline">Inline</SelectItem>
                <SelectItem value="inline-block">Inline Block</SelectItem>
                <SelectItem value="flex">Flex</SelectItem>
                <SelectItem value="inline-flex">Inline Flex</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </PropertyRow>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Padding</Label>
            <div className="grid grid-cols-4 gap-1">
              <Input
                value={parseNumeric(getValue("paddingTop"))}
                onChange={(e) =>
                  onStyleChange("paddingTop", `${e.target.value}px`)
                }
                className="h-7 text-xs text-center"
                placeholder="T"
                title="Top"
              />
              <Input
                value={parseNumeric(getValue("paddingRight"))}
                onChange={(e) =>
                  onStyleChange("paddingRight", `${e.target.value}px`)
                }
                className="h-7 text-xs text-center"
                placeholder="R"
                title="Right"
              />
              <Input
                value={parseNumeric(getValue("paddingBottom"))}
                onChange={(e) =>
                  onStyleChange("paddingBottom", `${e.target.value}px`)
                }
                className="h-7 text-xs text-center"
                placeholder="B"
                title="Bottom"
              />
              <Input
                value={parseNumeric(getValue("paddingLeft"))}
                onChange={(e) =>
                  onStyleChange("paddingLeft", `${e.target.value}px`)
                }
                className="h-7 text-xs text-center"
                placeholder="L"
                title="Left"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Margin</Label>
            <div className="grid grid-cols-4 gap-1">
              <Input
                value={parseNumeric(getValue("marginTop"))}
                onChange={(e) =>
                  onStyleChange("marginTop", `${e.target.value}px`)
                }
                className="h-7 text-xs text-center"
                placeholder="T"
                title="Top"
              />
              <Input
                value={parseNumeric(getValue("marginRight"))}
                onChange={(e) =>
                  onStyleChange("marginRight", `${e.target.value}px`)
                }
                className="h-7 text-xs text-center"
                placeholder="R"
                title="Right"
              />
              <Input
                value={parseNumeric(getValue("marginBottom"))}
                onChange={(e) =>
                  onStyleChange("marginBottom", `${e.target.value}px`)
                }
                className="h-7 text-xs text-center"
                placeholder="B"
                title="Bottom"
              />
              <Input
                value={parseNumeric(getValue("marginLeft"))}
                onChange={(e) =>
                  onStyleChange("marginLeft", `${e.target.value}px`)
                }
                className="h-7 text-xs text-center"
                placeholder="L"
                title="Left"
              />
            </div>
          </div>
        </Section>

        {/* Appearance Section */}
        <Section
          title="Appearance"
          icon={<Palette className="h-3 w-3" />}
          defaultOpen={true}
        >
          <PropertyRow label="Background">
            <ColorInput
              value={getValue("backgroundColor")}
              onChange={(value) => onStyleChange("backgroundColor", value)}
            />
          </PropertyRow>

          <PropertyRow label="Radius">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={parseNumeric(getValue("borderRadius"))}
                onChange={(e) =>
                  onStyleChange("borderRadius", `${e.target.value}px`)
                }
                className="h-7 text-xs w-16"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </PropertyRow>

          <PropertyRow label="Border">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={parseNumeric(getValue("borderWidth"))}
                onChange={(e) =>
                  onStyleChange("borderWidth", `${e.target.value}px`)
                }
                className="h-7 text-xs w-12"
              />
              <input
                type="color"
                value={rgbToHex(getValue("borderColor"))}
                onChange={(e) => onStyleChange("borderColor", e.target.value)}
                className="w-7 h-7 rounded border border-border cursor-pointer"
              />
            </div>
          </PropertyRow>

          <PropertyRow label="Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[parseFloat(getValue("opacity")) * 100 || 100]}
                onValueChange={([value]) =>
                  onStyleChange("opacity", String(value / 100))
                }
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {Math.round(parseFloat(getValue("opacity")) * 100 || 100)}%
              </span>
            </div>
          </PropertyRow>
        </Section>
      </div>

      {/* Footer Actions */}
      {hasUnsavedChanges && (
        <div className="px-3 py-2 border-t border-border/40 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscard}
            disabled={isSaving}
            className="flex-1 h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 h-8 text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
