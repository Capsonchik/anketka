export enum ROUTES {
  auth = 'auth',
  users = 'users',
}

export const apiRoutes = {
  auth: {
    register: `${ROUTES.auth}/register`,
    login: `${ROUTES.auth}/login`,
    refresh: `${ROUTES.auth}/refresh`,
    logout: `${ROUTES.auth}/logout`,
  },
  users: {
    me: `${ROUTES.users}/me`,
  },
} as const