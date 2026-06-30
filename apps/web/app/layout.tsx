import "./styles.css";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import type { ReactNode } from "react";

async function getInitialAuth() {
  if (process.env.CAREER_OS_AUTH_DISABLED === "true") return { user: null };
  const { accessToken: _accessToken, ...initialAuth } = await withAuth({ ensureSignedIn: false });
  return initialAuth;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initialAuth = await getInitialAuth();

  return (
    <html lang="en">
      <body>
        <AuthKitProvider initialAuth={initialAuth}>{children}</AuthKitProvider>
      </body>
    </html>
  );
}
