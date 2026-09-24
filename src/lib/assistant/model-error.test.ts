import test from "node:test";
import assert from "node:assert/strict";
import {localModelError} from "./model-error";
test("WebLLM worker string failures retain the actual cause",()=>{
 assert.equal(localModelError("Error: Failed to fetch model shard", "fallback"),"Error: Failed to fetch model shard");
 assert.equal(localModelError(new Error("GPU lost"),"fallback"),"GPU lost");
 assert.equal(localModelError({message:"Cache storage quota exceeded"},"fallback"),"Cache storage quota exceeded");
});
test("empty and malformed model errors use a bounded fallback",()=>{
 for(const value of [null,undefined,{},"  ",42])assert.equal(localModelError(value,"Try again"),"Try again");
 assert.equal(localModelError("x".repeat(700),"fallback").length,600);
});
