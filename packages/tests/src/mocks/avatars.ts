export type IAvatars = string[];

export const workspace_avatars = [
  'https://besafe-asset.s3.amazonaws.com/icon/workspaces/651.jpg',
  'https://besafe-asset.s3.amazonaws.com/icon/workspaces/152.jpg',
  'https://besafe-asset.s3.amazonaws.com/icon/workspaces/355.jpg',
  'https://besafe-asset.s3.amazonaws.com/icon/workspaces/453.jpg',
];

export const user_avatars = [
  'https://besafe-asset.s3.amazonaws.com/icon/users/540.jpg',
  'https://besafe-asset.s3.amazonaws.com/icon/users/539.jpg',
  'https://besafe-asset.s3.amazonaws.com/icon/users/241.jpg',
];

export const random_workspace_avatar = () => {
  return workspace_avatars[
    Math.floor(Math.random() * workspace_avatars.length)
  ];
};

export const random_user_avatar = () => {
  return user_avatars[Math.floor(Math.random() * user_avatars.length)];
};
