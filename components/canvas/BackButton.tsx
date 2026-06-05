"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsNavigating(true);
    router.push("/dashboard");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isNavigating}
      className="gap-2 px-3 h-9 text-muted-foreground hover:text-foreground bg-card/90 backdrop-blur-2xl saturate-150 border border-border hover:bg-card hover:border-border/80 transition-all duration-200"
      style={{
        boxShadow: "0 4px 16px -4px oklch(0 0 0 / 0.4)",
      }}
    >
      {isNavigating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ArrowLeft className="size-4" />
      )}
      <span className="font-medium">Dashboard</span>
    </Button>
  );
}
