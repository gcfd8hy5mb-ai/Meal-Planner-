// Draft Cloudflare Worker route. DO NOT deploy before production review.
// Bind RECIPE_API_KEY as a secret and optionally RECIPE_API_VERSION ('v1' or 'v2').
// This Worker is independent of the live tablewise-kroger Worker.
import {createMealDbProvider,supportedAreas,supportedCategories} from '../../luxury-v2/online-recipe-provider.mjs';
// Do not silently serve an unrelated cuisine when provider lacks a category.
const ALLOWED_TYPES=new Set(['Any',...Object.keys(supportedAreas),...Object.keys(supportedCategories)]);
const allowedOrigin='https://tablewise-luxury-preview.pages.dev';
const json=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleRecipeRequest(request,env,fetcher=fetch){
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 const u=new URL(request.url);
 if(u.pathname!=='/api/recipes')return json({error:'Not found'},404);
 // Protect this independent endpoint from browser cross-origin reads.
 const origin=request.headers.get('Origin');
 if(origin&&origin!==allowedOrigin)return json({error:'Origin not allowed'},403);
 const referer=request.headers.get('Referer');
 if(referer){let ref;try{ref=new URL(referer)}catch{return json({error:'Invalid referrer'},403)}
  if(ref.origin!==allowedOrigin)return json({error:'Origin not allowed'},403);
 }
 if(!env?.RECIPE_API_KEY)return json({error:'Online recipe search is not configured'},503);
 const ingredients=String(u.searchParams.get('ingredients')||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(ingredients.length<1||ingredients.length>12||ingredients.some(x=>x.length>60))return json({error:'Add 1–12 ingredients'},400);
 const type=u.searchParams.get('type')||'Any';
 if(!ALLOWED_TYPES.has(type))return json({error:'This food type is not supported by the online recipe provider yet'},422);
 const n=Number(u.searchParams.get('maxMissing')||2);
 if(!Number.isInteger(n)||n<0||n>5)return json({error:'Invalid missing ingredient limit'},400);
 // Never spend provider quota without a functioning, centrally enforced limiter.
 // The limiter binding must be provisioned independently before enabling this feature.
 if(typeof env.RECIPE_RATE_LIMITER?.limit!=='function')return json({error:'Recipe request protection is not configured'},503);
 // Edge IP is needed only as a limiter key, never stored or returned to the client.
 const clientIp=request.headers.get('CF-Connecting-IP');
 if(!clientIp||clientIp.length>64)return json({error:'Recipe request protection unavailable'},503);
 try{
  const verdict=await env.RECIPE_RATE_LIMITER.limit({key:clientIp});
  if(!verdict?.success)return json({error:'Too many recipe searches. Please try again shortly.'},429);
 }catch{return json({error:'Recipe request protection unavailable'},503)}
 try{
  const provider=createMealDbProvider({fetcher,apiKey:env.RECIPE_API_KEY,apiVersion:env.RECIPE_API_VERSION||'v1'});
  const recipes=await provider.search({ingredients,type,maxMissing:n,maxResults:15});
  return json({recipes:recipes.map(({id,name,image,area,category,sourceUrl,ingredients,instructions,missing,have,attribution})=>({id,name,image,area,category,sourceUrl,ingredients,instructions,missing,have,attribution}))});
 }catch{return json({error:'Recipe service unavailable'},502)}
}
export default {fetch(request,env){return handleRecipeRequest(request,env)}};
