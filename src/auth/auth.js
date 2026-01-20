export const auth = {
  login(user, token) {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
  },

  logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    return !!token && !!user;
  },

  hasRole(roles) {
    const user = this.getUser();
    if (!user?.role) return false;
    return roles.includes(user.role);
  },
};
