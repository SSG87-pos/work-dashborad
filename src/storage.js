export const dashboardStorageKey = "research-strategy-dashboard:v1";
export const supabaseImportHistoryKey = `${dashboardStorageKey}:supabase-import-history`;
export const dashboardDisplayPreferencesKey = `${dashboardStorageKey}:display-preferences`;

export const dashboardStateVersion = 1;
export const maxSupabaseImportHistory = 20;

export const defaultDashboardPreferences = {
  activePage: "my",
  activeView: "board",
  category: "전체",
  ownerFilter: "전체",
  priorityFilter: "전체",
  workKindFilter: "전체",
  timelineMode: "month",
  timelineMonth: "",
  timelineYear: "",
  selectedTaskId: "",
  displayDensity: "standard"
};

export function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const localDashboardStore = {
  id: "local",
  label: "로컬 프로토타입",
  canUse: canUseBrowserStorage,
  read: readDashboardState,
  write: writeDashboardState,
  clear: clearDashboardState
};

export const supabaseImportHistoryStore = {
  canUse: canUseBrowserStorage,
  read: readSupabaseImportHistory,
  find: findSupabaseImportRecord,
  write: writeSupabaseImportRecord,
  clear: clearSupabaseImportHistory
};

export const localDisplayPreferenceStore = {
  canUse: canUseBrowserStorage,
  read: readDisplayPreferences,
  write: writeDisplayPreferences
};

export function createDashboardSnapshot(state) {
  return {
    version: dashboardStateVersion,
    tasks: state.tasks ?? [],
    availableTags: state.availableTags ?? [],
    tagGroups: state.tagGroups ?? [],
    taskPostCategories: state.taskPostCategories ?? [],
    calendarEvents: state.calendarEvents ?? [],
    isAuthenticated: state.isAuthenticated ?? true,
    selectedPersonId: state.selectedPersonId ?? "kmryu",
    activePage: state.activePage ?? defaultDashboardPreferences.activePage,
    activeView: state.activeView ?? defaultDashboardPreferences.activeView,
    category: state.category ?? defaultDashboardPreferences.category,
    ownerFilter: state.ownerFilter ?? defaultDashboardPreferences.ownerFilter,
    priorityFilter: state.priorityFilter ?? defaultDashboardPreferences.priorityFilter,
    workKindFilter: state.workKindFilter ?? defaultDashboardPreferences.workKindFilter,
    timelineMode: state.timelineMode ?? defaultDashboardPreferences.timelineMode,
    timelineMonth: state.timelineMonth ?? defaultDashboardPreferences.timelineMonth,
    timelineYear: state.timelineYear ?? defaultDashboardPreferences.timelineYear,
    selectedTaskId: state.selectedTaskId ?? defaultDashboardPreferences.selectedTaskId,
    displayDensity: state.displayDensity ?? defaultDashboardPreferences.displayDensity,
    memoByPage: state.memoByPage ?? { my: "", team: "" },
    briefingItems: state.briefingItems ?? [],
    profileOverrides: state.profileOverrides ?? {}
  };
}

export function readDashboardState() {
  if (!canUseBrowserStorage()) return {};
  try {
    const raw = window.localStorage.getItem(dashboardStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("저장된 대시보드 상태를 불러오지 못했습니다.", error);
    return {};
  }
}

export function writeDashboardState(state) {
  if (!canUseBrowserStorage()) return false;
  try {
    window.localStorage.setItem(dashboardStorageKey, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("대시보드 상태를 저장하지 못했습니다.", error);
    return false;
  }
}

export function clearDashboardState() {
  if (!canUseBrowserStorage()) return false;
  window.localStorage.removeItem(dashboardStorageKey);
  return true;
}

export function readDisplayPreferences() {
  if (!canUseBrowserStorage()) return {};
  try {
    const raw = window.localStorage.getItem(dashboardDisplayPreferencesKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("화면 보기 설정을 불러오지 못했습니다.", error);
    return {};
  }
}

export function writeDisplayPreferences(preferences) {
  if (!canUseBrowserStorage()) return false;
  try {
    window.localStorage.setItem(dashboardDisplayPreferencesKey, JSON.stringify(preferences ?? {}));
    return true;
  } catch (error) {
    console.warn("화면 보기 설정을 저장하지 못했습니다.", error);
    return false;
  }
}

export function readSupabaseImportHistory() {
  if (!canUseBrowserStorage()) return [];
  try {
    const raw = window.localStorage.getItem(supabaseImportHistoryKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Supabase 가져오기 이력을 불러오지 못했습니다.", error);
    return [];
  }
}

export function findSupabaseImportRecord(fingerprint) {
  if (!fingerprint) return null;
  return readSupabaseImportHistory().find((record) => record?.fingerprint === fingerprint) ?? null;
}

export function writeSupabaseImportRecord(record) {
  if (!canUseBrowserStorage() || !record?.fingerprint) return false;
  const nextRecord = {
    ...record,
    importedAt: record.importedAt ?? new Date().toISOString()
  };
  const history = readSupabaseImportHistory().filter((item) => item?.fingerprint !== nextRecord.fingerprint);
  const nextHistory = [nextRecord, ...history].slice(0, maxSupabaseImportHistory);
  try {
    window.localStorage.setItem(supabaseImportHistoryKey, JSON.stringify(nextHistory));
    return true;
  } catch (error) {
    console.warn("Supabase 가져오기 이력을 저장하지 못했습니다.", error);
    return false;
  }
}

export function clearSupabaseImportHistory() {
  if (!canUseBrowserStorage()) return false;
  window.localStorage.removeItem(supabaseImportHistoryKey);
  return true;
}
