type Status = "concept" | "building" | "launched";

const colors: Record<Status, string> = {
  concept: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  building: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  launched: "bg-green-500/20 text-green-400 border-green-500/30",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded border ${colors[status]}`}
      style={{ fontFamily: "var(--font-syne)" }}
    >
      {status}
    </span>
  );
}