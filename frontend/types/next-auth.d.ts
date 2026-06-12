// NextAuth module augmentation.
//
// The credentials flow in lib/auth.ts attaches an `id` and a backend JWT
// (`accessToken`) to the session/token. The default next-auth types don't
// include these, so we extend them here. Types only — no runtime effect.

import { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    // Backend JWT returned by the api-gateway /auth/login endpoint.
    token?: string;
  }

  interface Session {
    user: {
      id: string;
      accessToken?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accessToken?: string;
  }
}
