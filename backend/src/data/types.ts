export type DbUserProfile = {
  name: string;
  hashedpassword: string;
  salt: string;
};

export type DbAuthSecret = {
  s: string;
  createdAt: number;
};

export type DbPoolSpec = {
  label: string;
  createdAt: number;
};
