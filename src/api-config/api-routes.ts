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
    project: (projectId: string) => `${ROUTES.projects}/${projectId}`,
    addressbook: (projectId: string) => `${ROUTES.projects}/${projectId}/addressbook`,
    addressbookUpload: (projectId: string) => `${ROUTES.projects}/${projectId}/addressbook/upload`,
    addressbookPointCreate: (projectId: string) => `${ROUTES.projects}/${projectId}/addressbook/points`,
    addressbookPoint: (projectId: string, pointId: string) => `${ROUTES.projects}/${projectId}/addressbook/points/${pointId}`,
    addressbookClone: (projectId: string) => `${ROUTES.projects}/${projectId}/addressbook/clone`,
    checklists: (projectId: string) => `${ROUTES.projects}/${projectId}/checklists`,
    checklistsUpload: (projectId: string) => `${ROUTES.projects}/${projectId}/checklists/upload`,
    checklistDetails: (projectId: string, checklistId: string) => `${ROUTES.projects}/${projectId}/checklists/${checklistId}`,
    checklistItems: (projectId: string, checklistId: string) => `${ROUTES.projects}/${projectId}/checklists/${checklistId}/items`,
    checklistItem: (projectId: string, checklistId: string, itemId: string) =>
      `${ROUTES.projects}/${projectId}/checklists/${checklistId}/items/${itemId}`,
    pointCatalog: (projectId: string, pointId: string) => `${ROUTES.projects}/${projectId}/points/${pointId}/catalog`,
    refRegions: `${ROUTES.projects}/refs/regions`,
    refCities: `${ROUTES.projects}/refs/cities`,
  },
} as const