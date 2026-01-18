export type LoginFormData = {
  identifier: string; //username or email
  password: string;
};

export type TwoFactorAuthProps = {
  sessionToken: string;
  twoFaSecret: string;
};
