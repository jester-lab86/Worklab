// Call this anywhere in the client to log an activity event
export async function logActivity(
  projectId: string | number,
  projectName: string,
  action: string,
  detail?: string
) {
  try {
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        project_name: projectName,
        action,
        detail: detail ?? null,
      }),
    });
  } catch {
    // Logging should never break the app — fail silently
  }
}