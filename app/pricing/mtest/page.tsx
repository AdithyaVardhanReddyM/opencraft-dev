"use client";

// TEMPORARY isolated test harness for MentionInput — delete after verification.
import { useRef, useState } from "react";
import {
  MentionInput,
  type MentionInputHandle,
} from "@/components/canvas/MentionInput";

const SUGGESTIONS = [
  { id: "1", name: "image 1", s3Key: "k1" },
  { id: "2", name: "image 2", s3Key: "k2" },
  { id: "3", name: "hero shot", s3Key: "k3" },
];
const URLS: Record<string, string> = {
  k1: "https://picsum.photos/seed/a/300/200",
  k2: "https://picsum.photos/seed/b/300/200",
  k3: "https://picsum.photos/seed/c/300/200",
};

export default function MentionTestPage() {
  const ref = useRef<MentionInputHandle>(null);
  const [out, setOut] = useState("");
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>MentionInput test harness</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const r = ref.current?.serialize();
          setOut(
            JSON.stringify({
              text: r?.text,
              attachments: r?.attachments.map((a) =>
                a.kind === "canvas" ? a.name : "upload"
              ),
            })
          );
        }}
      >
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 10,
            padding: 12,
            width: 420,
          }}
        >
          <MentionInput
            ref={ref}
            suggestions={SUGGESTIONS}
            resolveUrl={(k) => URLS[k]}
            placeholder="Type @ to add an image…"
          />
        </div>
        <button type="submit" id="send" style={{ marginTop: 12 }}>
          Send
        </button>
      </form>
      <pre id="out" data-testid="out" style={{ marginTop: 16 }}>
        {out}
      </pre>
    </div>
  );
}
