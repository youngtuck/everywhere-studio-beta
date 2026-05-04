/**
 * OutputTypePicker: Category/Type selector for Work sessions.
 *
 * Four categories:
 *   Content: Essay, Talk, Podcast, Video Script, Email (5)
 *   Business: Presentation, Proposal, One-Pager, Report, Executive Summary,
 *             Case Study, Statement of Work, Meeting Agenda/Recap,
 *             Bio/Speaker Profile, White Paper, Session Brief (11)
 *   Extended: Book, Website, Newsletter, Social Media (4)
 *   Freestyle: Freestyle (1)
 */

import { useState } from "react";

const FONT = "var(--font)";

export type OutputCategory = "Content" | "Business" | "Extended" | "Freestyle";

export interface OutputTypeOption {
  id: string;
  label: string;
  category: OutputCategory;
  isProject?: boolean; // Book, Website Content, Newsletter, Social Media
}

export const OUTPUT_TYPES: OutputTypeOption[] = [
  // Content (5)
  { id: "essay", label: "Essay", category: "Content" },
  { id: "talk", label: "Talk", category: "Content" },
  { id: "podcast", label: "Podcast", category: "Content" },
  { id: "video_script", label: "Video Script", category: "Content" },
  { id: "email", label: "Email", category: "Content" },
  { id: "sunday_story", label: "Sunday Story", category: "Content" },
  // Business (11)
  { id: "presentation", label: "Presentation", category: "Business" },
  { id: "proposal", label: "Proposal", category: "Business" },
  { id: "one_pager", label: "One-Pager", category: "Business" },
  { id: "report", label: "Report", category: "Business" },
  { id: "executive_summary", label: "Executive Summary", category: "Business" },
  { id: "case_study", label: "Case Study", category: "Business" },
  { id: "sow", label: "Statement of Work", category: "Business" },
  { id: "meeting", label: "Meeting Agenda / Recap", category: "Business" },
  { id: "bio", label: "Bio / Speaker Profile", category: "Business" },
  { id: "white_paper", label: "White Paper", category: "Business" },
  { id: "session_brief", label: "Session Brief", category: "Business" },
  // Extended (4)
  { id: "book", label: "Book", category: "Extended", isProject: true },
  { id: "website", label: "Website", category: "Extended", isProject: true },
  { id: "newsletter", label: "Newsletter", category: "Extended", isProject: true },
  { id: "social_media", label: "Social Media", category: "Extended", isProject: true },
  // Freestyle (1)
  { id: "freestyle", label: "Freestyle", category: "Freestyle" },
];

export const PROJECT_TYPE_IDS = OUTPUT_TYPES.filter(t => t.isProject).map(t => t.id);

const CATEGORIES: OutputCategory[] = ["Content", "Business", "Extended", "Freestyle"];

interface OutputTypePickerProps {
  selected: string | null;
  onSelect: (typeId: string) => void;
  compact?: boolean;
  /** When set, opens this category tab first (for example a sidebar overlay for one catalog group). */
  initialCategory?: OutputCategory;
}

export default function OutputTypePicker({ selected, onSelect, compact, initialCategory }: OutputTypePickerProps) {
  const [activeCategory, setActiveCategory] = useState<OutputCategory>(
    () =>
      initialCategory
        ?? (selected
          ? OUTPUT_TYPES.find(t => t.id === selected)?.category || "Content"
          : "Content"),
  );

  const typesForCategory = activeCategory === "Freestyle"
    ? OUTPUT_TYPES.filter(t => t.category === "Freestyle")
    : OUTPUT_TYPES.filter(t => t.category === activeCategory);

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Category tabs */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid var(--glass-border)",
        marginBottom: compact ? 8 : 12,
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              flex: cat === "Freestyle" ? "none" : 1,
              padding: compact ? "6px 10px" : "8px 14px",
              fontSize: compact ? 10 : 11,
              fontWeight: activeCategory === cat ? 600 : 400,
              color: activeCategory === cat ? "var(--fg)" : "var(--fg-3)",
              background: "transparent",
              border: "none",
              borderBottom: activeCategory === cat ? "2px solid var(--gold-bright)" : "2px solid transparent",
              cursor: "pointer",
              fontFamily: FONT,
              transition: "all 0.15s",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Type grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: compact ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: compact ? 4 : 6,
      }}>
        {typesForCategory.map(type => {
          const isSelected = selected === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              style={{
                padding: compact ? "6px 8px" : "10px 12px",
                borderRadius: 8,
                border: isSelected ? "2px solid var(--gold-bright)" : "1px solid var(--glass-border)",
                background: isSelected ? "rgba(245,198,66,0.08)" : "var(--glass-card)",
                cursor: "pointer",
                fontFamily: FONT,
                fontSize: compact ? 10 : 11,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? "var(--fg)" : "var(--fg-2)",
                textAlign: "left",
                transition: "all 0.12s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {type.label}
              {type.isProject && (
                <span style={{
                  fontSize: 8, color: "var(--fg-3)",
                  background: "var(--line)",
                  borderRadius: 3, padding: "1px 4px",
                  flexShrink: 0,
                }}>
                  extended
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
