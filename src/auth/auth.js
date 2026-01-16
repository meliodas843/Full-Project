export const auth = {
  user: null,

  login(role = "user") {
    this.user = { role };
  },

  logout() {
    this.user = null;
  },

  isAuthenticated() {
    return this.user !== null;
  },

  hasRole(roles) {
    return this.user && roles.includes(this.user.role);
  }
};
