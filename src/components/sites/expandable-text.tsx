"use client";

import { useMemo, useState } from "react";

type ExpandableTextProps = {
  text: string;
  maxLength?: number;
  className?: string;
};

export function ExpandableText({
  text,
  maxLength = 360,
  className,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(() => text.replace(/\s+/g, " ").trim(), [text]);
  const shouldCollapse = normalized.length > maxLength;
  const preview = shouldCollapse ? `${normalized.slice(0, maxLength).trimEnd()}...` : normalized;

  return (
    <div className={className}>
      <p>{expanded || !shouldCollapse ? normalized : preview}</p>
      {shouldCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
        >
          {expanded ? "Mostrar menos" : "Mostrar más"}
        </button>
      ) : null}
    </div>
  );
}
