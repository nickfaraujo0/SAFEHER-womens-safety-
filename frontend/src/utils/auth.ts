export const getCurrentUser = (): { id: string; name?: string; phone?: string } | null => {
  try {
    const raw = localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to parse currentUser from localStorage", e);
    return null;
  }
};
