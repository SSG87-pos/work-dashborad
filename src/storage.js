export const dashboardStorageKey = "research-strategy-dashboard:v1";

export const dashboardStateVersion = 1;

export const defaultDashboardPreferences = {
  activePage: "my",
  activeView: "board",
  category: "전체",
  priorityFilter: "전체",
  timelineMode: "month",
  timelineMonth: "",
  timelineYear: "",
  selectedTaskId: ""
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

export function createDashboardSnapshot(state) {
  return {
    version: dashboardStateVersion,
    tasks: state.tasks ?? [],
    availableTags: state.availableTags ?? [],
    calendarEvents: state.calendarEvents ?? [],
    isAuthenticated: state.isAuthenticated ?? true,
    selectedPersonId: state.selectedPersonId ?? "seoyeon",
    activePage: state.activePage ?? defaultDashboardPreferences.activePage,
    activeView: state.activeView ?? defaultDashboardPreferences.activeView,
    category: state.category ?? defaultDashboardPreferences.category,
    priorityFilter: state.priorityFilter ?? defaultDashboardPreferences.priorityFilter,
    timelineMode: state.timelineMode ?? defaultDashboardPreferences.timelineMode,
    timelineMonth: state.timelineMonth ?? defaultDashboardPreferences.timelineMonth,
    timelineYear: state.timelineYear ?? defaultDashboardPreferences.timelineYear,
    selectedTaskId: state.selectedTaskId ?? defaultDashboardPreferences.selectedTaskId,
    memoByPage: state.memoByPage ?? { my: "", team: "" },
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
