"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";

interface FileUploadProps {
  id: string;
  /** Visible prompt inside the drop zone. */
  label?: string;
  hint?: string;
  accept?: string;
  /** Receives the dropped/chosen files (empty array never fires). */
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

/** Extract plain text from a dropped file. PDF/DOCX need a parser we do not ship. */
export async function extractText(file: File): Promise<{ text: string; error: string | null }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type === "text/plain") {
    try {
      return { text: await file.text(), error: null };
    } catch {
      return { text: "", error: `Could not read “${file.name}”.` };
    }
  }
  return {
    text: "",
    error: `“${file.name}” is a ${name.endsWith(".pdf") ? "PDF" : name.endsWith(".docx") ? "DOCX" : "binary"} file — server-side extraction lands in Phase 4. Paste the text instead below.`,
  };
}

/**
 * Drag-and-drop + click file input. Keyboard accessible (real input under
 * the hood, visible focus ring), ARIA-labelled, with a compact variant.
 */
export function FileUpload({
  id,
  label = "Drop a contract, filing, or policy here",
  hint = "PDF, DOCX, or TXT — or click to browse",
  accept = ".pdf,.docx,.txt,.md",
  onFiles,
  disabled = false,
  compact = false,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files === null || files.length === 0) {
      return;
    }
    onFiles(Array.from(files));
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(event.dataTransfer.files);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "glass flex w-full cursor-pointer flex-col items-center gap-2 border-dashed text-center transition-all duration-200",
          compact ? "px-4 py-6" : "flex-col gap-3 px-6 py-12",
          isDragging
            ? "border-blue-400/60 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : "border-white/15 hover:border-blue-400/40 hover:bg-white/10",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors",
            isDragging ? "text-blue-300" : "text-slate-400",
          )}
        >
          <UploadCloud className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium tracking-tight text-slate-200">{label}</span>
        <span className="text-xs text-slate-400">{hint}</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          aria-label={`${label} — file picker`}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
