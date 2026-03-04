export enum ROUTES {
  auth = 'auth',
  users = 'users',
  team = 'team',
  projects = 'projects',
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
  team: {
    users: `${ROUTES.team}/users`,
  },
  projects: {
    projects: `${ROUTES.projects}`,
    addressbookUpload: (projectId: string) => `${ROUTES.projects}/${projectId}/addressbook/upload`,
    addressbookClone: (projectId: string) => `${ROUTES.projects}/${projectId}/addressbook/clone`,
  },
} as const