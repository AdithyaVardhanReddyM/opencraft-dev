import * as React from "react";

import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  "data-slot"?: string;
};

function Textarea({
  className,
  "data-slot": dataSlot = "textarea",
  ...props
}: TextareaProps) {
  const isGroupControl = dataSlot === "input-group-control";

  return (
    <textarea
      data-slot={dataSlot}
      className={cn(
        "border-input placeholder:text-muted-foreground dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        !isGroupControl &&
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        !isGroupControl &&
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
