"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useEditMode, type UseEditModeReturn } from "@/hooks/use-edit-mode";

// ============================================================================
// Context
// ============================================================================

const EditModeContext = createContext<UseEditModeReturn | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

interface EditModeProviderProps {
  children: ReactNode;
  sandboxId?: string;
  screenId?: string;
  sandboxUrl?: string;
  isActive?: boolean;
}

// ============================================================================
// Provider Component
// ============================================================================

export function EditModeProvider({
  children,
  sandboxId,
  screenId,
  sandboxUrl,
  isActive = true,
}: EditModeProviderProps) {
  const editMode = useEditMode({
    sandboxId,
    screenId,
    sandboxUrl,
  });

  // Disable edit mode when tab becomes inactive
  useEffect(() => {
    if (!isActive && editMode.isEditMode) {
      console.log("[EditModeProvider] Tab inactive, disabling edit mode");
      editMode.disableEditMode();
    }
  }, [isActive, editMode.isEditMode, editMode.disableEditMode]);

  return (
    <EditModeContext.Provider value={editMode}>
      {children}
    </EditModeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useEditModeContext(): UseEditModeReturn {
  const context = useContext(EditModeContext);

  if (!context) {
    throw new Error(
      "useEditModeContext must be used within an EditModeProvider"
    );
  }

  return context;
}

// ============================================================================
// Optional Hook (doesn't throw if outside provider)
// ============================================================================

export function useOptionalEditModeContext(): UseEditModeReturn | null {
  return useContext(EditModeContext);
}
