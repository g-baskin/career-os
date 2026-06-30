import { handleAuth } from "@workos-inc/authkit-nextjs";

export const GET = handleAuth({
  baseURL: process.env.WORKOS_BASE_URL,
  returnPathname: "/"
});
