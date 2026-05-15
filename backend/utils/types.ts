export type JwtPayloadType = {
  sub: number;
  role: string;
  email?: String 
};

export type AccessTokenType = {
  accessToken: string;
};