import { MODEL_HF_PATH } from "./local-model-id";

/** Retry interrupted model downloads, then cache complete bytes under the stable URL. */
export async function cacheModelAsset(
  request: RequestInfo,
  add: (request: Request) => Promise<void>,
  put: (request: Request, response: Response) => Promise<void>,
  fetchAsset: typeof fetch = fetch,
): Promise<void> {
  const original = new Request(request);
  try { await add(original); return; }
  catch (error) {
    original.signal.throwIfAborted();
    const url = new URL(original.url);
    if (url.origin !== "https://huggingface.co" || !url.pathname.startsWith(MODEL_HF_PATH)
      || !/NetworkError|TypeError|fetch|network/i.test(String(error))) throw error;
    for (let attempt = 0; attempt < 2; attempt++) {
      original.signal.throwIfAborted();
      url.searchParams.set("download", "true");
      url.searchParams.set("hikesync_retry", `${Date.now()}-${attempt}`);
      try {
        const response = await fetchAsset(new Request(url, {
          cache: "no-store", credentials: "omit",
          signal: AbortSignal.any([original.signal, AbortSignal.timeout(90_000)]),
        }));
        if (response.status !== 200) throw new Error(`Model download returned HTTP ${response.status}.`);
        // A 200 response can still fail midway through its body. Never cache it
        // until the whole shard has arrived, and retain the original cache key.
        const bytes = await response.arrayBuffer();
        if (!bytes.byteLength) throw new Error("The model download was empty.");
        original.signal.throwIfAborted();
        await put(original, new Response(bytes, { headers: response.headers }));
        return;
      } catch (retryError) {
        original.signal.throwIfAborted();
        if (retryError instanceof DOMException && retryError.name === "QuotaExceededError") throw retryError;
        if (attempt === 1) throw new Error("A model file could not finish downloading. Check your connection and retry; completed files remain cached.");
      }
    }
  }
}
