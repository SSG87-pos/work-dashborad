export function shouldUsePrototypeFallbackData({ isRemoteReady } = {}) {
  return !isRemoteReady;
}

export function shouldExposeLocalAccountSwitcher({ isRemoteReady } = {}) {
  return !isRemoteReady;
}

export function buildPeopleDirectory({
  basePeople = [],
  profileOverrides = {},
  includePrototypePeople = true,
  unassignedPerson = null
} = {}) {
  const safeProfiles = profileOverrides && typeof profileOverrides === "object" ? profileOverrides : {};
  const baseIds = new Set(includePrototypePeople ? basePeople.map((person) => person.id) : []);
  const base = includePrototypePeople
    ? basePeople.map((person) => ({ ...person, ...(safeProfiles[person.id] ?? {}) }))
    : [];
  const extras = Object.entries(safeProfiles)
    .filter(([id]) => !baseIds.has(id))
    .map(([id, profile]) => ({
      id,
      name: profile.name ?? "새 사용자",
      role: profile.role ?? "팀원",
      permissionRole: profile.permissionRole ?? "member",
      color: profile.color ?? "#2563eb",
      emoji: profile.emoji ?? "🌿",
      isTeamMember: profile.isTeamMember ?? true,
      isActive: profile.isActive ?? true,
      expectedEmail: profile.expectedEmail ?? "",
      authUserId: profile.authUserId ?? ""
    }));
  const entries = includePrototypePeople && unassignedPerson
    ? [unassignedPerson, ...base, ...extras.filter((person) => person.id !== unassignedPerson.id)]
    : [...base, ...extras.filter((person) => person.id !== unassignedPerson?.id)];
  return entries;
}
