import jwt from "jsonwebtoken";

export async function useServerAuth(event: any) {
  const authHeader = getHeader(event, "authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null };
  }

  const token = authHeader.replace("Bearer ", "");

  // Verify Auth0 JWT (simplified example)
  const decoded = jwt.decode(token) as any;

  if (!decoded?.sub) {
    return { user: null };
  }

  // 🔑 Load your user from DB using Auth0 user id
  const userId = await requireUser(event);

  return { userId };
}
