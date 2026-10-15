// Luxury v2 adapter: cloud saves remain release-gated until hosted Firebase validation.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, getDoc, getDocFromServer, doc, runTransaction } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { recipes, verifiedRecipePhotos } from './catalog.js';
import { groceryTotals } from './groceries.mjs';
import {groceryKey,readChecklist,saveChecklist} from './checklist.mjs';
import {replacePreviewMeal,previewAccount,hasPreviewEdits} from './meal-preview.mjs';
import {readPendingLuxuryDraft,commitLuxuryPreview,classifyLuxuryRecovery,verifyLuxurySavedPlan} from './save-flow.mjs';

const firebaseConfig={apiKey:'AIzaSyBETYaxuDmBR6_dNDCu62d_ciDph3AqKjI',authDomain:'meal-planner-a478e.firebaseapp.com',projectId:'meal-planner-a478e',storageBucket:'meal-planner-a478e.firebasestorage.app',messagingSenderId:'695296765702',appId:'1:695296765702:web:bfd3f88f4253c56038b887'};
const firebase=initializeApp(firebaseConfig);
const auth=getAuth(firebase),db=getFirestore(firebase);
const baseRecipes=new Map(recipes.map(r=>[r.id,r]));
let account=null,accountUid=null,liveWeek=1,currentRecipe=null,step=0,authEpoch=0,groceryWeek='both',previewEdits={};
const effectiveAccount=()=>previewAccount(account,previewEdits);
const accountPanel=document.querySelector('#luxuryAccountPanel');
const authMessage=document.querySelector('#luxuryAuthMessage');
const authForm=document.querySelector('#luxurySignInForm');
const authPassword=document.querySelector('#luxuryPassword');
document.querySelector('.profile').onclick=()=>{accountPanel.hidden=!accountPanel.hidden;authForm.hidden=!!auth.currentUser;document.querySelector('#luxurySignOut').hidden=!auth.currentUser;authMessage.textContent=auth.currentUser?'Signed in. Your saved meals are read-only in this preview.':'Sign in to load your saved Tablewise account.';if(!accountPanel.hidden)accountPanel.scrollIntoView({block:'start'})};
document.querySelector('#luxuryCloseAccount').onclick=()=>{accountPanel.hidden=true;authPassword.value=''};
authForm.onsubmit=async event=>{
 event.preventDefault();
 const button=document.querySelector('#luxurySignIn');
 button.disabled=true;authMessage.textContent='Signing in securely…';
 try{
  await signInWithEmailAndPassword(auth,document.querySelector('#luxuryEmail').value.trim(),authPassword.value);
  authPassword.value='';
  authMessage.textContent='Signed in. Loading your saved meals…';
  authForm.hidden=true;document.querySelector('#luxurySignOut').hidden=false;
 }catch(error){
  authPassword.value='';
  authMessage.textContent='Could not sign in. Check your email and password, then try again.';
 }finally{button.disabled=false}
};
document.querySelector('#luxurySignOut').onclick=async()=>{
 const button=document.querySelector('#luxurySignOut');button.disabled=true;
 try{await signOut(auth);authPassword.value='';authForm.hidden=false;button.hidden=true;authMessage.textContent='Signed out. Your saved cloud meals were not changed.'}
 catch{authMessage.textContent='Could not sign out. Try again.'}
 finally{button.disabled=false}
};
const previewNotice=document.getElementById('accountDataStatus');
if (!previewNotice) throw new Error('Luxury v2 account status boundary missing');
previewNotice.textContent='Checking your account. This preview never changes your saved data.';
const label=(message)=>{previewNotice.textContent=message};
const customRecipes=()=>{let raw=account?.custom||[];if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch{return []}}return Array.isArray(raw)?raw:[]};
const findRecipe=(id)=>baseRecipes.get(id)||customRecipes().find(r=>r.id===id);
const photo=(id)=>{const path=verifiedRecipePhotos[id];return path?(path.startsWith('assets/')?'../'+path:path):''};
const planFor=(week)=>{const state=effectiveAccount();if(!state)return null;const active=state.activePlanningWeek===2?2:1;return week===active?state.plan:state.alternateWeek?.plan};
const dayMeal=(week,day,slot)=>{const row=planFor(week)?.[day];return findRecipe(row?.[slot])||null};
const formatAmount=(n,unit)=>{const amount=Number(n);return (Number.isFinite(amount)?(Math.round(amount*100)/100):n)+' '+(unit||'')};
const setHero=()=>{const dinner=dayMeal(account?.activePlanningWeek===2?2:1,new Date().getDay(),2);const heading=document.querySelector('.hero-copy h2'),subtitle=document.querySelector('.hero-copy .muted'),picture=document.querySelector('.hero-photo');if(!heading||!subtitle||!picture)return;heading.textContent=dinner?.name||'No dinner planned today';subtitle.textContent=dinner?(dinner.serv||account?.servings||2)+' servings · Your saved plan':'No dinner scheduled in your saved plan';picture.style.backgroundImage=dinner&&photo(dinner.id)?'linear-gradient(transparent 35%,#10271ed9),url("'+photo(dinner.id)+'")':'none';const cookButton=document.querySelector('.hero .primary');if(cookButton)cookButton.onclick=()=>dinner?openRecipe(dinner):showPage('week')};
const renderWeek=(week)=>{liveWeek=Number(week)||1;const list=document.querySelector('#days');if(!list)return;list.replaceChildren();for(let day=0;day<7;day++){const meal=dayMeal(liveWeek,day,2);const card=document.createElement('div');card.className='day';const dayLabel=document.createElement('strong');dayLabel.textContent=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day];card.append(dayLabel);if(meal&&photo(meal.id)){const img=document.createElement('img');img.src=photo(meal.id);img.alt='';img.loading='lazy';card.append(img)}const body=document.createElement('div'),name=document.createElement('strong'),small=document.createElement('small');name.textContent=meal?.name||'No dinner planned';small.textContent=meal?(hasPreviewEdits(previewEdits)?'Preview plan · not saved':'Saved recipe'):'No meal scheduled';body.append(name,document.createElement('br'),small);card.append(body);if(meal){const button=document.createElement('button');button.className='primary';button.textContent='›';button.setAttribute('aria-label','View '+meal.name);button.onclick=()=>openRecipe(meal);card.append(button)}const edit=document.createElement('button');edit.className='primary';edit.textContent='Change';edit.setAttribute('aria-label','Preview another dinner for '+dayLabel.textContent);edit.onclick=()=>openMealPicker(liveWeek,day);card.append(edit);list.append(card)}};
// Statically off until separate hosted-project validation and recovery review pass.
const LUXURY_SAVES_RELEASED=false;
let luxurySaving=false;
const saveLuxuryButton=document.querySelector('#saveLuxuryEdits');
const refreshDiscard=()=>{const unsaved=hasPreviewEdits(previewEdits);document.querySelector('#discardLuxuryEdits').hidden=!unsaved;document.querySelector('#luxuryDraftActions').hidden=!unsaved;saveLuxuryButton.disabled=!LUXURY_SAVES_RELEASED||!unsaved||!accountUid||luxurySaving;saveLuxuryButton.textContent=LUXURY_SAVES_RELEASED?'Save meal changes':'Save changes (release testing pending)'};
saveLuxuryButton.onclick=async()=>{
 if(!LUXURY_SAVES_RELEASED||luxurySaving||!accountUid||!account||!hasPreviewEdits(previewEdits))return;
 const uid=accountUid,epoch=authEpoch,original=account,preview={...previewEdits};
 luxurySaving=true;refreshDiscard();label('Saving your meal changes securely…');
 let transactionResult=null;
 try{
  const result=await commitLuxuryPreview({
   storage:localStorage,uid,original,preview,
   runTransaction:callback=>runTransaction(db,callback),
   documentRef:doc(db,'users',uid),
   getAuthenticatedUid:()=>authEpoch===epoch&&auth.currentUser?.uid===uid?uid:null,
   retainBackupUntilVerified:true
  });
  if(authEpoch!==epoch||auth.currentUser?.uid!==uid)return;
  // A committed transaction must not be reported as an unsaved draft if its reload fails.
  transactionResult=result;
  // A fresh server document becomes the next verified baseline.
  const cloud=await getDocFromServer(doc(db,'users',uid));
  if(authEpoch!==epoch||auth.currentUser?.uid!==uid)return;
  if(!cloud.exists())throw Error('Saved plan could not be reloaded');
  verifyLuxurySavedPlan(original,preview,cloud.data());
  account=cloud.data();previewEdits={};renderWeek(liveWeek);setHero();renderIngredients();
  let cleanupWarning='';
  try{localStorage.removeItem('tablewise-luxury-pending-'+uid)}
  catch{cleanupWarning='Saved and verified in the cloud, but the recovery backup remains on this device.'}
  refreshRecovered();
  label(cleanupWarning||'Meal changes saved to your account.');
 }catch(error){
  if(authEpoch===epoch&&auth.currentUser?.uid===uid){
   if(transactionResult){
    label('Cloud write completed, but the server reload could not be verified. Check your saved plan after reconnecting before making another change. '+(error?.message||''));
   }else{
    label('Save was not confirmed. Review the device recovery options before retrying. '+(error?.message||'Check your connection.'));
   }
   refreshRecovered();
  }
 }finally{luxurySaving=false;if(authEpoch===epoch)refreshDiscard()}
};
const downloadLuxuryDraft=(draft)=>{
 const blob=new Blob([JSON.stringify(draft,null,2)],{type:'application/json'});
 const href=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=href;link.download='tablewise-luxury-unsaved-'+(draft.uid||'plan')+'.json';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
document.querySelector('#exportLuxuryEdits').onclick=()=>{
 if(!accountUid||!account||!hasPreviewEdits(previewEdits))return;
 downloadLuxuryDraft({version:1,uid:accountUid,original:account,preview:previewEdits});
 label('A copy of your preview was prepared for download. Changes have NOT been saved to the cloud.');
};
document.querySelector('#exportRecoveredLuxury').onclick=()=>{
 if(!accountUid)return;
 try{const pending=readPendingLuxuryDraft(localStorage,accountUid);if(!pending||pending.unreadable){label('Previous draft cannot be read on this device. No cloud changes were made.');return}downloadLuxuryDraft(pending);label('Recovered draft prepared for download. Cloud data has not changed.')}
 catch{label('Device storage cannot be accessed. No cloud changes were made.')}
};
const refreshRecovered=()=>{
 const area=document.querySelector('#luxuryRecoverActions');
 if(!accountUid){area.hidden=true;return}
 try{const backup=readPendingLuxuryDraft(localStorage,accountUid);area.hidden=!backup;
 if(backup){
  const recovery=classifyLuxuryRecovery(backup,account,accountUid);
  const copy={
   'already-saved':'These edits appear to be saved in the cloud, but their device backup remains. Export before clearing.',
   'unsaved':'An earlier meal change was not saved. Export your draft before deciding how to proceed.',
   'conflict':'Another device changed the saved plan. Export your draft; automatic overwrite is blocked.',
   'cloud-missing':'Cloud data was not found. Export the device draft; do not overwrite cloud data.',
   'unreadable':'A previous draft is unreadable or belongs to another account. Cloud saving is blocked.'
  };
  document.querySelector('#luxuryRecoverStatus').textContent=copy[recovery.status]||'Review or export this device draft.';
 }}
 catch{area.hidden=false;document.querySelector('#luxuryRecoverStatus').textContent='Device storage is unavailable. Do not assume unsaved data is safe.'}
};
document.querySelector('#discardLuxuryEdits').onclick=()=>{previewEdits={};refreshDiscard();document.querySelector('#luxuryMealPicker').hidden=true;renderWeek(liveWeek);setHero();renderIngredients();label('Preview discarded. Your saved meals are unchanged.')};
const openMealPicker=(week,day)=>{
 if(!account) return;
 const picker=document.querySelector('#luxuryMealPicker');
 const options=document.querySelector('#luxuryMealChoices');options.replaceChildren();
 const chosen=recipes.filter(r=>r.slot==='Dinner').sort((a,b)=>a.name.localeCompare(b.name));
 for(const recipe of chosen){
   const button=document.createElement('button');button.type='button';button.className='grocery-item';button.textContent=recipe.name;
   button.onclick=()=>{previewEdits=replacePreviewMeal(account,previewEdits,week,day,2,recipe.id);picker.hidden=true;refreshDiscard();renderWeek(week);setHero();renderIngredients();label('Preview updated. Grocery quantities recalculated. Meal changes are not saved to your account.')};
   options.append(button);
 }
 const cancel=document.querySelector('#cancelLuxuryMealPicker');cancel.onclick=()=>{picker.hidden=true};
 picker.hidden=false;
 picker.scrollIntoView({block:'nearest'});
};
const showCookStep=()=>{const count=document.querySelector('#stepCount'),title=document.querySelector('#cookStepTitle'),body=document.querySelector('#cookStepBody');const items=currentRecipe?.steps||[];const n=items.length;count.textContent=n?'Step '+(step+1)+' of '+n:'No cooking steps available';title.textContent=currentRecipe?.name||'Select a meal';body.textContent=items[step]||'Open a saved recipe to view its cooking instructions.';document.querySelector('#previousStep').disabled=step===0;document.querySelector('#nextStep').disabled=!n;document.querySelector('#nextStep').textContent=step===n-1?'Done':'Next'};
const openRecipe=(recipe)=>{currentRecipe=recipe;step=0;const img=document.querySelector('.cook-photo');const url=photo(recipe.id);if(url){img.src=url;img.alt=recipe.name;img.hidden=false}else img.hidden=true;showCookStep();showPage('cook')};
const renderIngredients=(scope='plan')=>{
 const host=document.querySelector('#groceryItems');if(!host)return;
 host.replaceChildren();
 const heading=document.querySelector('#groceryCount');
 const clear=document.querySelector('#clearGroceries');
 clear.hidden=true;
 const intro=document.createElement('p');intro.className='notice';
 if (!account || !accountUid) {intro.textContent='Sign in to view grocery quantities from your saved plan.';heading.textContent='No saved plan loaded';host.append(intro);return}
 const recipeOnly=scope==='recipe'&&currentRecipe;
 const rows=recipeOnly
   ? (currentRecipe.ingredients||[]).map(([name,quantity,unit])=>({name,quantity,unit}))
   : groceryTotals(effectiveAccount(),findRecipe,groceryWeek==='both'?[1,2]:[Number(groceryWeek)]);
 intro.textContent=recipeOnly
   ? 'Measured ingredients for '+currentRecipe.name+'. Quantities are for the base recipe.'
   : (groceryWeek==='both'?'Both weeks':('Week '+groceryWeek))+' · Grocery checks stay on this device, not synced to your account.';
 host.append(intro);
 if (!rows.length){heading.textContent='0 ingredients';const empty=document.createElement('p');empty.className='notice';empty.textContent='No planned recipe ingredients found.';host.append(empty);return}
 if(recipeOnly){heading.textContent=rows.length+' recipe ingredients';for(const item of rows){const row=document.createElement('div');row.className='grocery-item';row.textContent=item.name+' — '+formatAmount(item.quantity,item.unit);host.append(row)}return}
 const scopeKey=groceryWeek;
 const checks=readChecklist(localStorage,accountUid,scopeKey,rows);
 const updateHeading=()=>{heading.textContent=Object.values(checks).filter(Boolean).length+' of '+rows.length+' checked'};
 const persist=()=>saveChecklist(localStorage,accountUid,scopeKey,rows,checks);
 for(const item of rows){
   const key=groceryKey(item);
   const row=document.createElement('button');row.type='button';row.className='grocery-item';
   row.setAttribute('aria-pressed',String(!!checks[key]));
   const marker=document.createElement('span'),caption=document.createElement('span');
   marker.setAttribute('aria-hidden','true');caption.textContent=item.name+' — '+formatAmount(item.quantity,item.unit);
   const paint=()=>{row.classList.toggle('checked',!!checks[key]);row.setAttribute('aria-pressed',String(!!checks[key]));marker.textContent=checks[key]?'☑':'□'};
   row.addEventListener('click',()=>{checks[key]=!checks[key];if(!persist())label('Grocery checks could not be saved on this device. Your cloud plan was not changed.');paint();updateHeading()});
   paint();row.append(marker,caption);host.append(row);
 }
 clear.hidden=false;clear.textContent='Uncheck all';
 clear.onclick=()=>{for(const key of Object.keys(checks))delete checks[key];if(!persist())label('Grocery checks could not be saved on this device.');renderIngredients()};
 updateHeading();
};
document.querySelector('#previousStep').onclick=()=>{step=Math.max(0,step-1);showCookStep()};
document.querySelector('#nextStep').onclick=()=>{if(step+1>=(currentRecipe?.steps?.length||0)){showPage('today');return}step++;showCookStep()};
document.querySelector('.full').onclick=()=>{renderIngredients('recipe');showPage('groceries')};
document.querySelectorAll('[data-nav="groceries"]').forEach(b=>b.addEventListener('click',()=>renderIngredients()));
document.querySelectorAll('[data-grocery-week]').forEach(b=>b.addEventListener('click',()=>{
  groceryWeek=b.dataset.groceryWeek;
  document.querySelectorAll('[data-grocery-week]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});
  renderIngredients();
}));
document.querySelectorAll('[data-week]').forEach(b=>b.addEventListener('click',()=>{if(account)renderWeek(b.dataset.week)}));
const resetPrivateView=()=>{
 // Clear all previous account content synchronously, before any next-account fetch.
 account=null;accountUid=null;currentRecipe=null;step=0;previewEdits={};liveWeek=1;groceryWeek='both';
 document.querySelector('#luxuryRecoverActions').hidden=true;
 refreshDiscard();
 const picker=document.querySelector('#luxuryMealPicker');picker.hidden=true;
 document.querySelector('#luxuryMealChoices').replaceChildren();
 document.querySelector('#days').replaceChildren();
 const placeholder=document.createElement('p');placeholder.className='notice';placeholder.textContent='Sign in to view your saved two-week plan.';
 document.querySelector('#days').append(placeholder);
 document.querySelector('.hero-copy h2').textContent='No dinner selected';
 document.querySelector('.hero-copy .muted').textContent='Sign in to see your saved dinner.';
 document.querySelector('.hero-photo').style.backgroundImage='none';
 const cookButton=document.querySelector('.hero .primary');cookButton.onclick=()=>showPage('week');
 document.querySelector('.cook-photo').removeAttribute('src');
 document.querySelector('.cook-photo').hidden=true;
 document.querySelector('#stepCount').textContent='No recipe selected';
 document.querySelector('#cookStepTitle').textContent='Select a meal';
 document.querySelector('#cookStepBody').textContent='Open a saved recipe to see its cooking instructions.';
 document.querySelector('#previousStep').disabled=true;
 document.querySelector('#nextStep').disabled=true;
 for(const card of document.querySelectorAll('.simple .meal-row')){
   card.querySelector('small').textContent='Sign in to view this meal';
   card.onclick=()=>showPage('week');
 }
 for(const button of document.querySelectorAll('[data-week]')){
   const active=button.dataset.week==='1';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
 }
 for(const button of document.querySelectorAll('[data-grocery-week]')){
   const active=button.dataset.groceryWeek==='both';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
 }
 renderIngredients();
};
onAuthStateChanged(auth,async user=>{const epoch=++authEpoch;resetPrivateView();if(!user){label('Sign in using the profile icon to load your saved Tablewise meals. Cloud saving is disabled in this preview.');return}label('Loading your saved plan securely…');try{const snapshot=await getDocFromServer(doc(db,'users',user.uid));if(epoch!==authEpoch)return;if(!snapshot.exists()){label('Your saved cloud plan was not found. Nothing has been modified. Your account needs recovery before this preview can display saved meals.');return}const loaded=snapshot.data();if(!loaded.preferences){label('Your saved preferences need recovery. No data has been changed.');return}account=loaded;accountUid=user.uid;refreshRecovered();label('Connected to your saved Tablewise plan. You can preview changes without saving them.');liveWeek=account.activePlanningWeek===2?2:1;document.querySelectorAll('[data-week]').forEach(b=>b.classList.toggle('active',Number(b.dataset.week)===liveWeek));setHero();renderWeek(liveWeek);const weekHint=document.querySelector('[data-page="week"]>.muted');if(weekHint)weekHint.textContent='Choose Change to preview a different dinner. Preview changes are not saved.';const meals=document.querySelectorAll('.simple .meal-row');for(let i=0;i<meals.length;i++){const recipe=dayMeal(liveWeek,new Date().getDay(),i);const small=meals[i].querySelector('small');if(small)small.textContent=recipe?.name||'Not planned';meals[i].onclick=()=>recipe?openRecipe(recipe):showPage('week')}renderIngredients()}catch(error){if(epoch!==authEpoch)return;label('Could not read your saved plan. No changes were made. Check your connection and try again.');console.error('Luxury preview read failed',error)}});
