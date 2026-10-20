// Cloudflare Pages Function: same-origin recipe discovery on Tablewise preview.
// This is intentionally safe without a provider key: returns 503, never calls external APIs.
// Keep the RECIPE_API_KEY as an encrypted Pages runtime secret.
import {handleRecipeRequest} from '../../ops/recipe-search/worker.mjs';
export async function onRequestGet(context){
 return handleRecipeRequest(context.request,context.env);
}
export async function onRequest(context){
 return handleRecipeRequest(context.request,context.env);
}
