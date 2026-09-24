import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";
import { cacheModelAsset } from "@/lib/assistant/model-cache";
// WebLLM uses Cache.add(), which can fail on interrupted streamed downloads.
// The recovery is restricted to this model's public asset URLs in this worker.
const add = Cache.prototype.add;
Cache.prototype.add = function(request: RequestInfo) {
  return cacheModelAsset(request, value => add.call(this, value), (key, response) => this.put(key, response));
};
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (event: MessageEvent) => handler.onmessage(event);
