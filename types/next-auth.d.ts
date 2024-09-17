import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    expires: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      repoUrl?: string;
      username?: string; // Add this line
    };
  }
}