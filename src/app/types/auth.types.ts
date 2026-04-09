export type LoginRequest = {
  nameUser: string;
  passUser: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string; // "Bearer"
  expiresIn: string; // "1d" (pero lo más confiable será JWT exp)
  user: {
    id: string;
    nameUser: string;
    nameSurname: string;
    email: string;
    roleId: string;
    reportes?: string[];
    effectiveReportes?: string[];
    role: { id: string; nombre: string; reportes?: string[] };
  };
};

export type JwtPayload = {
  sub?: string;
  nameUser?: string;
  roleId?: string;
  iat?: number;
  exp?: number; // unix seconds
};
