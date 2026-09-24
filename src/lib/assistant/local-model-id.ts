/** Browser WebLLM model. Llama 3.2 3B is the best agent-capable option that still fits typical desktop WebGPU memory. */
export const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
export const MODEL_LABEL = "Llama 3.2 3B";
/** Hugging Face resolve path used for interrupted-download recovery in the model worker. */
export const MODEL_HF_PATH = `/mlc-ai/${MODEL_ID}/resolve/`;
