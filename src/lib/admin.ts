export function isAdminAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const header = request.headers.get("x-admin-secret");
  if (header === secret) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("admin_secret");
  return querySecret === secret;
}

export function adminUnauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized — set ADMIN_SECRET and pass x-admin-secret header" },
    { status: 401 },
  );
}
