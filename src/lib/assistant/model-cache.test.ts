import test from 'node:test';
import assert from 'node:assert/strict';
import {cacheModelAsset} from './model-cache';
const url='https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC/resolve/main/params_shard_21.bin';
const failed=async()=>{throw new DOMException('Cache.add network error','NetworkError');};
test('model recovery fetches complete bytes and preserves the stable cache key',async()=>{
 let saved=''; let body='';
 await cacheModelAsset(url,failed,async(key,response)=>{saved=key.url;body=await response.text();},async request=>{
  const r=request as Request;assert.equal(r.cache,'no-store');assert.equal(new URL(r.url).searchParams.get('download'),'true');
  return new Response('complete model bytes');
 });
 assert.equal(saved,url);assert.equal(body,'complete model bytes');
});
test('failed response streams retry and partial responses never enter the cache',async()=>{
 let calls=0;let puts=0;
 await cacheModelAsset(url,failed,async()=>{puts++;},async()=>{
  if(++calls===1)return new Response(new ReadableStream({start(c){c.error(new TypeError('network stream interrupted'));}}));
  return new Response('complete');
 });
 assert.equal(calls,2);assert.equal(puts,1);
 calls=0;puts=0;
 await assert.rejects(cacheModelAsset(url,failed,async()=>{puts++;},async()=>{calls++;return new Response('partial',{status:206});}),/could not finish/);
 assert.equal(calls,2);assert.equal(puts,0);
});
test('normal cache hits, unrelated hosts, and storage quota errors do not trigger downloads',async()=>{
 const never=async()=>{throw new Error('unexpected fetch');};
 await cacheModelAsset(url,async()=>{},never,never);
 await assert.rejects(cacheModelAsset('https://example.com/model.bin',failed,never,never),/network error/);
 await assert.rejects(cacheModelAsset(url,async()=>{throw new DOMException('Full','QuotaExceededError');},never,never),/Full/);
});
test('cancelled model requests cannot restart or populate the cache',async()=>{
 const controller=new AbortController();let puts=0;let fetches=0;
 await assert.rejects(cacheModelAsset(new Request(url,{signal:controller.signal}),failed,async()=>{puts++;},async()=>{
  fetches++;controller.abort();return new Response('bytes');
 }),{name:'AbortError'});
 assert.equal(fetches,1);assert.equal(puts,0);
});
