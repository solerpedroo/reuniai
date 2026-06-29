import type { Tag } from "@/lib/workflow/types";

export function MeetingTagBadges({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
