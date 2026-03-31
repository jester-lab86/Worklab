export type ProjectStatus = "concept" | "building" | "launched";
export type FeatureStatus = "planned" | "in-progress" | "complete";

export type Feature = {
  id: string;
  name: string;
  status: FeatureStatus;
  phase?: string;
};

export type Phase = {
  id: string;
  title: string;
  completed: boolean;
};

export type Version = {
  id: string;
  number: string;
  title: string;
  status: "complete" | "in-progress" | "planned";
  features: Feature[];
  phases: Phase[];
};

export type TechCategory = {
  category: string;
  items: string[];
};

export type Project = {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  version: string;
  tech_stack: string[];
  tech_stack_grouped: TechCategory[];
  features: string[];
  phases: Phase[];
  versions: Version[];
  current_progress: string;
  still_to_complete: string[];
  notes: string;
  blockers: string;
  created_at: string;
  updated_at: string;
};