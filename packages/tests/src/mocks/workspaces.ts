import { ISelectWorkspaceResponse } from 'bakosafe/src/api/auth';
import { user_avatars, workspace_avatars } from './avatars';

export const workspace = {
  WORKSPACE_1: {
    id: 'bf9e1d7f-f714-496c-913d-4f71737ebedf',
    name: 'WK1',
    avatar: workspace_avatars[0],
  },
  WORKSPACE_2: {
    id: 'bf9e1d7f-f714-496c-913d-4ebedff71737',
    name: 'WK2',
    avatar: workspace_avatars[1],
  },
  WORKSPACE_3: {
    id: '1d7fbf9e-f714-496c-913d-4f71737ebedf',
    name: 'WK3',
    avatar: workspace_avatars[2],
  },
};

export type IWorkspaceKeys = keyof typeof workspace;

export const findById = (id: string): ISelectWorkspaceResponse | undefined => {
  const keys = Object.keys(workspace) as IWorkspaceKeys[];
  const key = keys.find((k) => workspace[k].id === id);
  if (key) {
    return workspace[key];
  } else {
    throw new Error('Workspace not found');
  }
};
