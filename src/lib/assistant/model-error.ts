/** Worker errors arrive as strings rather than Error instances. */
export function localModelError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message
    : typeof error === "string" ? error
    : error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message
    : "";
  return message.trim().slice(0, 600) || fallback;
}
