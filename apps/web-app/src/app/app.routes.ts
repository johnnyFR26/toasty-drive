import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'drive',
    pathMatch: 'full',
  },
  {
    path: 'drive',
    loadComponent: () => import('./pages/drive/drive').then((m) => m.Drive),
  },
  {
    path: 'drive/:folderId',
    loadComponent: () => import('./pages/drive/drive').then((m) => m.Drive),
  },
  {
    path: 'share/:shareId',
    loadComponent: () =>
      import('./pages/shared-view/shared-view').then((m) => m.SharedView),
  },
  {
    path: '**',
    redirectTo: 'drive',
  },
];
