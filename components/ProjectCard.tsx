import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { Project } from "@/types";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="border border-[#00d4ff22] bg-[#0f172a] hover:border-[#00d4ff66] hover:bg-[#0f172a]/80 transition-all rounded-lg p-5 cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <h2
            className="text-lg font-bold text-white group-hover:text-[#00d4ff] transition-colors"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {project.name}
          </h2>
          <StatusBadge status={project.status} />
        </div>

        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {project.description || "No description yet."}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>v{project.version}</span>
          <span className="text-[#00d4ff44]">
            {project.tech_stack?.slice(0, 3).join(" · ")}
          </span>
        </div>
      </div>
    </Link>
  );
}