"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ImageIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";
import type { PillAttachment } from "@/hooks/use-chat-streaming";

export interface MentionSuggestion {
  id: string;
  name: string;
  s3Key: string;
}

export interface MentionInputHandle {
  /** Walk the editor in order → plain text (pills contribute attachments only). */
  serialize: () => { text: string; attachments: PillAttachment[] };
  clear: () => void;
  focus: () => void;
  /** Insert files as upload pills at the caret (paste / drop / file-picker). */
  addUploads: (files: File[]) => void;
  /** Append plain text (used to seed an initial prompt). */
  insertText: (text: string) => void;
}

interface MentionInputProps {
  placeholder?: string;
  disabled?: boolean;
  suggestions: MentionSuggestion[];
  /** Resolve an S3 key to a presigned URL for the hover preview. */
  resolveUrl?: (s3Key: string) => string | null | undefined;
  /** Notifies the parent of content/attachment changes (drives vision warning etc.). */
  onChange?: (state: { attachmentCount: number; hasContent: boolean }) => void;
  /** Intercept a plain-text paste (e.g. browser-extension content). Return true
   *  to consume it so the editor does not also insert the raw text. */
  onExtensionPaste?: (text: string) => boolean;
  className?: string;
}

const PILL_SELECTOR = "[data-pill-id]";

/**
 * A contentEditable token field: free text with inline image "pills" that can sit
 * anywhere in the text (type → `@` → pick → pill drops in at the caret → keep
 * typing after it). The editor is UNCONTROLLED — React never re-renders its
 * content (which would jump the caret); we mutate the DOM directly and read it
 * back on serialize. Pills are `contentEditable=false` atomic spans, so Backspace
 * deletes them whole and the caret can't land inside them.
 */
export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  function MentionInput(
    {
      placeholder,
      disabled,
      suggestions,
      resolveUrl,
      onChange,
      onExtensionPaste,
      className,
    },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    // pillId -> attachment (the File / s3Key the DOM node can't hold itself).
    const attachmentsRef = useRef<Map<string, PillAttachment>>(new Map());

    const [isEmpty, setIsEmpty] = useState(true);

    // Mention dropdown state.
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    // Viewport-relative anchor (editor's top-left) for the portaled dropdown.
    // The dropdown is rendered into document.body to escape the several
    // overflow-hidden ancestors (sidebar root, tabs, input card) that would
    // otherwise clip it as it opens upward.
    const [anchorRect, setAnchorRect] = useState<{
      left: number;
      top: number;
    } | null>(null);

    // Hover preview state for a pill (pills are raw DOM nodes, not React).
    // left/bottom are viewport-relative (the preview is also portaled).
    const [hover, setHover] = useState<{
      url: string;
      name: string;
      left: number;
      bottom: number;
    } | null>(null);

    const matches = useMemo(
      () =>
        mentionQuery === null
          ? []
          : suggestions.filter((s) =>
              s.name.toLowerCase().includes(mentionQuery.toLowerCase())
            ),
      [mentionQuery, suggestions]
    );
    const isMentionOpen = mentionQuery !== null && matches.length > 0;

    // ----- helpers ----------------------------------------------------------

    const notifyChange = useCallback(() => {
      const editor = editorRef.current;
      const empty =
        !editor ||
        (editor.textContent ?? "").trim() === "" &&
          editor.querySelector(PILL_SELECTOR) === null;
      setIsEmpty(empty);
      onChange?.({
        attachmentCount: attachmentsRef.current.size,
        hasContent: !empty,
      });
    }, [onChange]);

    // Build a pill DOM node for an attachment.
    const buildPill = useCallback((att: PillAttachment): HTMLSpanElement => {
      const span = document.createElement("span");
      span.dataset.pillId = att.id;
      span.contentEditable = "false";
      span.setAttribute("contenteditable", "false");
      span.dataset.kind = att.kind;
      if (att.kind === "canvas") {
        span.dataset.name = att.name;
        span.dataset.s3key = att.s3Key;
      } else {
        span.dataset.name = att.file.name;
        span.dataset.url = att.previewUrl;
      }
      span.className =
        "mention-pill inline-flex select-none items-center gap-1 align-middle rounded-[5px] border border-primary/30 bg-primary/10 px-1.5 py-px text-sm leading-tight text-primary";
      const label = document.createElement("span");
      label.textContent = att.kind === "canvas" ? att.name : "image";
      label.className = "pointer-events-none";
      const close = document.createElement("button");
      close.type = "button";
      close.dataset.removePill = att.id;
      close.setAttribute("aria-label", "Remove image");
      close.className =
        "ml-0.5 flex size-3.5 items-center justify-center rounded-sm text-primary/70 hover:bg-primary/20 hover:text-primary";
      close.textContent = "×"; // ×
      span.appendChild(label);
      span.appendChild(close);
      return span;
    }, []);

    // Insert nodes at the current caret (or at the end if no caret in editor).
    const insertAtCaret = useCallback((...nodes: Node[]) => {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      let range: Range;
      if (
        sel &&
        sel.rangeCount > 0 &&
        editor.contains(sel.getRangeAt(0).commonAncestorContainer)
      ) {
        range = sel.getRangeAt(0);
        range.deleteContents();
      } else {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      const frag = document.createDocumentFragment();
      for (const n of nodes) frag.appendChild(n);
      const last = frag.lastChild;
      range.insertNode(frag);
      // Place caret after the inserted content.
      if (last) {
        const after = document.createRange();
        after.setStartAfter(last);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
      }
      editor.focus();
    }, []);

    const insertPill = useCallback(
      (att: PillAttachment) => {
        attachmentsRef.current.set(att.id, att);
        const pill = buildPill(att);
        const space = document.createTextNode(" "); // nbsp keeps the gap
        insertAtCaret(pill, space);
        notifyChange();
      },
      [buildPill, insertAtCaret, notifyChange]
    );

    // ----- mention detection ------------------------------------------------

    // Find an active "@token" immediately before the caret within a text node.
    const readActiveMention = useCallback(() => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!editor || !sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return null;
      let node = range.startContainer;
      let startOffset = range.startOffset;
      // When the caret is anchored on the editor element (e.g. right after an
      // atomic pill), resolve to the text node immediately before the caret.
      if (node.nodeType === Node.ELEMENT_NODE && node === editor) {
        const prev = editor.childNodes[startOffset - 1];
        if (prev && prev.nodeType === Node.TEXT_NODE) {
          node = prev;
          startOffset = (prev.textContent ?? "").length;
        }
      }
      if (node.nodeType !== Node.TEXT_NODE || !editor.contains(node))
        return null;
      const before = (node.textContent ?? "").slice(0, startOffset);
      const m = /(?:^|\s)@([\w-]*)$/.exec(before);
      if (!m) return null;
      return {
        node: node as Text,
        // start index of the '@' within this text node
        atIndex: startOffset - m[1].length - 1,
        caretOffset: startOffset,
        query: m[1],
      };
    }, []);

    // Drop side-map entries (and revoke blob URLs) for pills no longer in the
    // DOM — e.g. removed by Backspace/Delete/Cut. Returns whether anything changed.
    const reconcileAttachments = useCallback(() => {
      const editor = editorRef.current;
      if (!editor) return false;
      const present = new Set(
        Array.from(editor.querySelectorAll(PILL_SELECTOR)).map(
          (el) => (el as HTMLElement).dataset.pillId
        )
      );
      let changed = false;
      for (const [id, att] of attachmentsRef.current) {
        if (!present.has(id)) {
          if (att.kind === "upload") URL.revokeObjectURL(att.previewUrl);
          attachmentsRef.current.delete(id);
          changed = true;
        }
      }
      return changed;
    }, []);

    const handleInput = useCallback(() => {
      reconcileAttachments();
      const active = readActiveMention();
      if (active) {
        setMentionQuery(active.query);
        setMentionIndex(0);
        const rect = editorRef.current?.getBoundingClientRect();
        if (rect) setAnchorRect({ left: rect.left, top: rect.top });
      } else {
        setMentionQuery(null);
      }
      notifyChange();
    }, [reconcileAttachments, readActiveMention, notifyChange]);

    // Lightweight cleanup for keyup/cut: reconcile only, WITHOUT re-running the
    // mention detection (which would reset the dropdown's highlighted index and
    // break Arrow-key navigation).
    const handleEditCleanup = useCallback(() => {
      if (reconcileAttachments()) notifyChange();
    }, [reconcileAttachments, notifyChange]);

    const chooseMention = useCallback(
      (s: MentionSuggestion) => {
        const active = readActiveMention();
        // Remove the "@token" text the user typed, then drop the pill in its place.
        if (active) {
          const r = document.createRange();
          r.setStart(active.node, active.atIndex);
          r.setEnd(active.node, active.caretOffset);
          r.deleteContents();
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(r);
        }
        setMentionQuery(null);
        insertPill({
          kind: "canvas",
          id: nanoid(),
          name: s.name,
          s3Key: s.s3Key,
        });
      },
      [readActiveMention, insertPill]
    );

    // ----- imperative API ---------------------------------------------------

    useImperativeHandle(
      ref,
      () => ({
        serialize() {
          const editor = editorRef.current;
          const attachments: PillAttachment[] = [];
          if (!editor) return { text: "", attachments };
          let text = "";
          const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              text += node.textContent ?? "";
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const el = node as HTMLElement;
            if (el.dataset?.pillId) {
              const att = attachmentsRef.current.get(el.dataset.pillId);
              if (att) attachments.push(att); // pills add images, not text
              return;
            }
            if (el.tagName === "BR") {
              text += "\n";
              return;
            }
            // <div><br></div> is one empty line: the BR already emitted '\n', so
            // don't also add the block-close newline.
            const onlyBr =
              el.tagName === "DIV" &&
              el.childNodes.length === 1 &&
              (el.firstChild as HTMLElement | null)?.tagName === "BR";
            el.childNodes.forEach(walk);
            if (el.tagName === "DIV" && !onlyBr) text += "\n";
          };
          editor.childNodes.forEach(walk);
          return { text: text.replace(/ /g, " ").trim(), attachments };
        },
        clear() {
          const editor = editorRef.current;
          if (editor) editor.innerHTML = "";
          // Revoke any upload blob URLs before dropping the map.
          for (const att of attachmentsRef.current.values()) {
            if (att.kind === "upload") URL.revokeObjectURL(att.previewUrl);
          }
          attachmentsRef.current.clear();
          setMentionQuery(null);
          notifyChange();
        },
        focus() {
          editorRef.current?.focus();
        },
        addUploads(files: File[]) {
          const images = files.filter((f) => f.type.startsWith("image/"));
          if (images.length === 0) return;
          for (const file of images) {
            insertPill({
              kind: "upload",
              id: nanoid(),
              file,
              previewUrl: URL.createObjectURL(file),
            });
          }
        },
        insertText(text: string) {
          insertAtCaret(document.createTextNode(text));
          notifyChange();
        },
      }),
      [insertPill, insertAtCaret, notifyChange]
    );

    // ----- events -----------------------------------------------------------

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isMentionOpen) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setMentionIndex((i) => (i + 1) % matches.length);
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setMentionIndex((i) => (i - 1 + matches.length) % matches.length);
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            chooseMention(matches[mentionIndex] ?? matches[0]);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setMentionQuery(null);
            return;
          }
        }
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          // Submit via the surrounding form, but only if its submit button is
          // enabled — otherwise (mid-generation / limit reached) the send is
          // silently dropped and we'd clear the user's unsent text.
          e.preventDefault();
          const form = editorRef.current?.closest("form");
          const submitBtn = form?.querySelector(
            'button[type="submit"]'
          ) as HTMLButtonElement | null;
          if (!submitBtn?.disabled) form?.requestSubmit();
        }
      },
      [isMentionOpen, matches, mentionIndex, chooseMention]
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        const items = e.clipboardData?.items;
        const files: File[] = [];
        if (items) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const f = item.getAsFile();
              if (f) files.push(f);
            }
          }
        }
        if (files.length > 0) {
          e.preventDefault();
          for (const file of files) {
            insertPill({
              kind: "upload",
              id: nanoid(),
              file,
              previewUrl: URL.createObjectURL(file),
            });
          }
          return;
        }
        // Plain-text only — never paste rich HTML into the editor.
        const text = e.clipboardData.getData("text/plain");
        if (text) {
          e.preventDefault();
          // Let the parent claim special pastes (e.g. extension content).
          if (onExtensionPaste?.(text)) return;
          insertAtCaret(document.createTextNode(text));
          handleInput();
        }
      },
      [insertPill, insertAtCaret, handleInput, onExtensionPaste]
    );

    // Remove a pill via its × button (event delegation, since pills are raw DOM).
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const removeBtn = target.closest("[data-remove-pill]") as HTMLElement | null;
        if (!removeBtn) return;
        e.preventDefault();
        const id = removeBtn.dataset.removePill!;
        const pill = editorRef.current?.querySelector(
          `[data-pill-id="${id}"]`
        );
        const att = attachmentsRef.current.get(id);
        if (att?.kind === "upload") URL.revokeObjectURL(att.previewUrl);
        attachmentsRef.current.delete(id);
        // Drop a collapsed caret where the pill was so typing continues there.
        const editor = editorRef.current;
        if (pill && editor) {
          const r = document.createRange();
          r.setStartBefore(pill);
          r.collapse(true);
          pill.remove();
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(r);
        } else {
          pill?.remove();
        }
        setHover(null);
        notifyChange();
        editorRef.current?.focus();
      },
      [notifyChange]
    );

    // Hover preview: show the image when the pointer is over a pill.
    const handleMouseOver = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const pill = (e.target as HTMLElement).closest(
          PILL_SELECTOR
        ) as HTMLElement | null;
        if (!pill) return;
        const kind = pill.dataset.kind;
        const url =
          kind === "upload"
            ? pill.dataset.url
            : resolveUrl?.(pill.dataset.s3key ?? "");
        if (!url) return;
        const rect = pill.getBoundingClientRect();
        setHover({
          url,
          name: pill.dataset.name ?? "image",
          left: rect.left,
          bottom: window.innerHeight - rect.top,
        });
      },
      [resolveUrl]
    );

    const handleMouseOut = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const to = e.relatedTarget as HTMLElement | null;
        if (to && to.closest?.(PILL_SELECTOR)) return;
        setHover(null);
      },
      []
    );

    // Revoke any leftover blob URLs on unmount.
    useEffect(() => {
      const map = attachmentsRef.current;
      return () => {
        for (const att of map.values()) {
          if (att.kind === "upload") URL.revokeObjectURL(att.previewUrl);
        }
      };
    }, []);

    return (
      <div className="relative">
        {/* Mention dropdown — portaled to <body> so it isn't clipped by the
            several overflow-hidden ancestors (sidebar, tabs, input card). It is
            fixed-positioned, opening upward from the editor's top edge. */}
        {isMentionOpen &&
          anchorRect &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed z-100 max-h-56 w-56 overflow-y-auto rounded-lg border border-border/60 bg-popover p-1 shadow-lg"
              style={{
                left: anchorRect.left,
                bottom: `calc(100vh - ${anchorRect.top}px + 4px)`,
              }}
            >
              {matches.map((s, i) => {
                const url = resolveUrl?.(s.s3Key);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      chooseMention(s);
                    }}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      i === mentionIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={s.name}
                          className="size-6 object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-3.5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>,
            document.body
          )}

        {/* Hover preview for a pill — also portaled, fixed to the viewport. */}
        {hover &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="pointer-events-none fixed z-100 overflow-hidden rounded-lg border border-border/60 bg-popover p-1 shadow-lg"
              style={{ left: hover.left, bottom: hover.bottom + 4 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hover.url}
                alt={hover.name}
                className="max-h-56 max-w-[15rem] rounded object-contain"
              />
            </div>,
            document.body
          )}

        {/* Editor */}
        <div
          ref={editorRef}
          data-slot="input-group-control"
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          contentEditable={!disabled}
          suppressContentEditableWarning
          spellCheck
          onInput={handleInput}
          onKeyUp={handleEditCleanup}
          onCut={handleEditCleanup}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onClick={handleClick}
          onScroll={() => setHover(null)}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          className={cn(
            "max-h-[120px] min-h-[28px] w-full overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed outline-none [overflow-wrap:anywhere]",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        />
        {isEmpty && (
          <span className="pointer-events-none absolute left-0 top-0 text-sm leading-relaxed text-muted-foreground/50">
            {placeholder}
          </span>
        )}
      </div>
    );
  }
);
