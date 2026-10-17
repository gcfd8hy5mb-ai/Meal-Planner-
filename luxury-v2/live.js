// Luxury v2 adapter: cloud saves remain release-gated until hosted Firebase validation.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, getDoc, getDocFromServer, doc, runTransaction } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { recipes, verifiedRecipePhotos } from './catalog.js';
import {recipeSummary} from './recipe-details.mjs';
import {diagnoseSavedPlan} from './recovery-diagnostic.mjs';
import { groceryTotals } from './groceries.mjs';
import {groupGroceryItems} from './grocery-categories.mjs';
import {krogerRequest} from './kroger-connect.mjs';
import {readKrogerStore,saveKrogerStore} from './kroger-store.mjs';
import {krogerPriceSummary,sortKrogerOffers} from './kroger-pricing.mjs';
import {searchMeals,mealCategories} from './meal-search.mjs';
import {groceryKey,readChecklist,saveChecklist} from './checklist.mjs';
import {replacePreviewMeal,previewAccount,hasPreviewEdits} from './meal-preview.mjs';
import {readPendingLuxuryDraft,commitLuxuryPreview,classifyLuxuryRecovery,verifyLuxurySavedPlan} from './save-flow.mjs';

const firebaseConfig={apiKey:'AIzaSyBETYaxuDmBR6_dNDCu62d_ciDph3AqKjI',authDomain:'meal-planner-a478e.firebaseapp.com',projectId:'meal-planner-a478e',storageBucket:'meal-planner-a478e.firebasestorage.app',messagingSenderId:'695296765702',appId:'1:695296765702:web:bfd3f88f4253c56038b887'};
const firebase=initializeApp(firebaseConfig);
const auth=getAuth(firebase),db=getFirestore(firebase);
const baseRecipes=new Map(recipes.map(r=>[r.id,r]));
let account=null,accountUid=null,liveWeek=1,currentRecipe=null,step=0,authEpoch=0,groceryWeek='both',previewEdits={};
const effectiveAccount=()=>previewAccount(account,previewEdits);
const krogerStatus=document.querySelector('#krogerConnectionStatus');
const krogerConnectButton=document.querySelector('#krogerConnectButton');
const krogerDisconnectButton=document.querySelector('#krogerDisconnectButton');
let krogerEpoch=0;
const krogerDisplay=(message,connected=false)=>{
 krogerStatus.textContent=message;
 krogerConnectButton.hidden=connected;
 productPanel.hidden=!connected;if(!connected)clearKrogerProducts({keepStore:true});
 krogerDisconnectButton.hidden=!connected;
 krogerConnectButton.disabled=!auth.currentUser||connected;
};
const groceryKrogerToggle=document.querySelector('#groceryKrogerToggle');
const groceryKrogerDrawer=document.querySelector('#groceryKrogerDrawer');
groceryKrogerToggle.onclick=()=>{
 const opening=groceryKrogerDrawer.hidden;
 groceryKrogerDrawer.hidden=!opening;
 groceryKrogerToggle.setAttribute('aria-expanded',String(opening));
 if(opening)groceryKrogerDrawer.scrollIntoView({behavior:'smooth',block:'nearest'});
};
const krogerStoreZip=document.querySelector('#krogerStoreZip');
const krogerStoreSelect=document.querySelector('#krogerStoreSelect');
const krogerStoreMessage=document.querySelector('#krogerStoreMessage');
let krogerLocationId='';
let storeLookupEpoch=0;
const restoreKrogerStore=user=>{
 if(!user)return;const saved=readKrogerStore(localStorage,user.uid);if(!saved)return;
 krogerLocationId=saved.id;krogerStoreZip.value=saved.zip||'';
 krogerStoreSelect.replaceChildren();const option=document.createElement('option');option.value=saved.id;option.textContent=saved.label;krogerStoreSelect.append(option);
 krogerStoreSelect.hidden=false;krogerStoreMessage.textContent='Saved store: '+saved.label+'. Change store to search somewhere else.';
};
const clearStoreResults=()=>{++storeLookupEpoch;krogerStoreSelect.replaceChildren();krogerStoreSelect.hidden=true;krogerLocationId=''};
document.querySelector('#krogerFindStores').onclick=async()=>{
 const user=auth.currentUser,zip=krogerStoreZip.value.trim();
 if(!user){krogerStoreMessage.textContent='Sign in before choosing a store.';return}
 if(!/^\d{5}$/.test(zip)){krogerStoreMessage.textContent='Enter a 5-digit ZIP code.';return}
 clearStoreResults();resetKrogerMatches();const epoch=storeLookupEpoch;
 krogerStoreMessage.textContent='Finding Kroger stores…';
 try{
  const data=await krogerRequest(user,'/locations',{params:{zip}});
  if(epoch!==storeLookupEpoch||auth.currentUser?.uid!==user.uid)return;
  if(!data.locations?.length){krogerStoreMessage.textContent='No stores found nearby. Try another ZIP code.';return}
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose your store';krogerStoreSelect.append(placeholder);
  for(const store of data.locations){const option=document.createElement('option');option.value=store.id;option.textContent=store.name+' — '+store.address;krogerStoreSelect.append(option)}
  krogerStoreSelect.hidden=false;krogerStoreMessage.textContent='Select a store to see location-specific promotions.';
 }catch(error){if(epoch===storeLookupEpoch)krogerStoreMessage.textContent=error.message||'Store lookup unavailable.'}
};
krogerStoreSelect.onchange=()=>{
 krogerLocationId=krogerStoreSelect.value;
 resetKrogerMatches();selectedKroger.clear();renderKrogerSelection();productResults.replaceChildren();
 if(krogerLocationId){
  const label=krogerStoreSelect.selectedOptions[0]?.textContent||'Selected Kroger';
  const saved=saveKrogerStore(localStorage,auth.currentUser?.uid,{id:krogerLocationId,label,zip:krogerStoreZip.value.trim()});
  krogerStoreMessage.textContent=saved?'Saved store: '+label+'. Store-specific prices will be requested.':'Store selected, but could not save the preference on this device.';
 }else krogerStoreMessage.textContent='Choose a Kroger store first.';
};
const productPanel=document.querySelector('#krogerProductReview');
const productResults=document.querySelector('#krogerProductResults');
const productMessage=document.querySelector('#krogerProductMessage');
const cartReview=document.querySelector('#krogerCartReview');
const selectedKroger=new Map();
let productSearchEpoch=0;
const clearKrogerProducts=({keepStore=false}={})=>{if(!keepStore)clearStoreResults();resetKrogerMatches();++productSearchEpoch;selectedKroger.clear();productResults.replaceChildren();cartReview.hidden=true;productPanel.hidden=true};
const renderKrogerSelection=()=>{cartReview.hidden=!selectedKroger.size;document.querySelector('#krogerCartSelection').textContent=selectedKroger.size+' products selected. Review before adding to Kroger.'};
document.querySelector('#krogerSearchButton').onclick=async()=>{
 const user=auth.currentUser;if(!user)return;
 const term=document.querySelector('#krogerProductTerm').value.trim();if(term.length<2){productMessage.textContent='Enter at least two characters.';return}
 if(!krogerLocationId){productMessage.textContent='Choose your Kroger store first.';return}
 const epoch=++productSearchEpoch;productMessage.textContent='Searching products…';productResults.replaceChildren();
 try{const data=await krogerRequest(user,'/products',{params:{term,locationId:krogerLocationId}});
  if(epoch!==productSearchEpoch||auth.currentUser?.uid!==user.uid)return;
  for(const item of data.products||[]){
   const row=document.createElement('div');row.className='kroger-result';
   const info=document.createElement('div'),title=document.createElement('strong'),details=document.createElement('small');
   title.textContent=item.name;const offer=krogerPriceSummary(item);
   details.textContent=[item.brand,item.size,offer.label].filter(Boolean).join(' / ');
   info.append(title,details);
   const button=document.createElement('button');button.type='button';button.textContent=selectedKroger.has(item.upc)?'Remove':'Select';
   button.onclick=()=>{if(selectedKroger.has(item.upc))selectedKroger.delete(item.upc);else selectedKroger.set(item.upc,{upc:item.upc,quantity:1});button.textContent=selectedKroger.has(item.upc)?'Remove':'Select';renderKrogerSelection()};
   row.append(info,button);productResults.append(row);
  }
  productMessage.textContent=(data.products||[]).length+' product matches. Promotions appear only when Kroger supplies a discounted price; weekly ad and digital coupons may not be included.';
 }catch(error){if(epoch===productSearchEpoch)productMessage.textContent=error.message||'Search unavailable.'}
};
document.querySelector('#krogerAddCartButton').onclick=async()=>{
 const user=auth.currentUser;if(!user||!selectedKroger.size)return;
 const items=[...selectedKroger.values()];
 if(!window.confirm('Add '+items.length+' selected products to your Kroger cart? This will not place an order.'))return;
 const button=document.querySelector('#krogerAddCartButton');button.disabled=true;productMessage.textContent='Updating cart…';
 try{const result=await krogerRequest(user,'/cart/add',{method:'POST',body:{items}});if(auth.currentUser?.uid!==user.uid)return;productMessage.textContent=result.message||'Cart updated. Review in Kroger.';selectedKroger.clear();renderKrogerSelection()}
 catch(error){productMessage.textContent=error.message||'Could not update cart.'}
 finally{button.disabled=false}
};
const krogerMatchButton=document.querySelector('#krogerMatchList');
const krogerMatchMore=document.querySelector('#krogerMatchMore');
const krogerMatchProgress=document.querySelector('#krogerMatchProgress');
const krogerMatchResults=document.querySelector('#krogerMatchResults');
let matchEpoch=0,matchQueue=[],matchPosition=0;
const resetKrogerMatches=()=>{++matchEpoch;matchQueue=[];matchPosition=0;krogerMatchResults.replaceChildren();krogerMatchMore.hidden=true;krogerMatchProgress.textContent=''};
const appendKrogerMatch=(item,products)=>{
 const group=document.createElement('div');group.className='kroger-match-group';
 const heading=document.createElement('strong');heading.textContent=item.name+' — '+formatAmount(item.quantity,item.unit);
 group.append(heading);
 if(!products.length){const missing=document.createElement('p');missing.textContent='No matching Kroger products found. Try searching by name.';group.append(missing)}
 for(const product of sortKrogerOffers(products).slice(0,2)){
  const row=document.createElement('div');row.className='kroger-result';
  const details=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('small');
  name.textContent=product.name;const offer=krogerPriceSummary(product);
  meta.textContent=[product.brand,product.size,offer.label].filter(Boolean).join(' / ');
  details.append(name,meta);
  const select=document.createElement('button');select.type='button';
  const paint=()=>{select.textContent=selectedKroger.has(product.upc)?'Remove':'Select'};
  select.onclick=()=>{if(selectedKroger.has(product.upc))selectedKroger.delete(product.upc);else selectedKroger.set(product.upc,{upc:product.upc,quantity:1});paint();renderKrogerSelection()};
  paint();row.append(details,select);group.append(row);
 }
 krogerMatchResults.append(group);
};
const loadKrogerMatches=async()=>{
 const user=auth.currentUser,epoch=matchEpoch;if(!user)return;
 if(!krogerLocationId){krogerMatchProgress.textContent='Choose your Kroger store before matching products.';return}
 krogerMatchMore.hidden=true;krogerMatchButton.disabled=true;
 const stop=Math.min(matchQueue.length,matchPosition+5);
 while(matchPosition<stop){
  const item=matchQueue[matchPosition++];
  krogerMatchProgress.textContent='Matching '+matchPosition+' of '+matchQueue.length+' ingredients…';
  try{
   const result=await krogerRequest(user,'/products',{params:{term:item.name,locationId:krogerLocationId}});
   if(epoch!==matchEpoch||auth.currentUser?.uid!==user.uid)return;
   appendKrogerMatch(item,result.products||[]);
  }catch{
   if(epoch!==matchEpoch||auth.currentUser?.uid!==user.uid)return;
   appendKrogerMatch(item,[]);
  }
 }
 if(epoch===matchEpoch){
  krogerMatchProgress.textContent='Reviewed '+matchPosition+' of '+matchQueue.length+' ingredients. Promotions appear only if Kroger supplies them; check the weekly ad and digital coupons separately.';
  krogerMatchMore.hidden=matchPosition>=matchQueue.length;krogerMatchButton.disabled=false;
 }
};
krogerMatchButton.onclick=()=>{
 if(!auth.currentUser||!account||!accountUid){krogerMatchProgress.textContent='Sign in and load your saved meal plan first.';return}
 resetKrogerMatches();
 matchQueue=groceryTotals(effectiveAccount(),findRecipe,groceryWeek==='both'?[1,2]:[Number(groceryWeek)]);
 if(!matchQueue.length){krogerMatchProgress.textContent='No saved grocery ingredients to match.';return}
 void loadKrogerMatches();
};
krogerMatchMore.onclick=()=>{void loadKrogerMatches()};
const refreshKroger=async()=>{
 const epoch=++krogerEpoch,user=auth.currentUser;
 if(!user){krogerDisplay('Sign in to Tablewise to connect your Kroger account.');return}
 krogerDisplay('Checking Kroger connection…');krogerConnectButton.disabled=true;
 try{const result=await krogerRequest(user,'/status');if(epoch!==krogerEpoch||auth.currentUser?.uid!==user.uid)return;
  krogerDisplay(result.connected?'Kroger connected. Product selection will require your confirmation.':'Not connected. Connect to shop your grocery list at Kroger.',!!result.connected);
 }catch{if(epoch===krogerEpoch)krogerDisplay('Kroger connection is unavailable. Try again.');}
};
krogerConnectButton.onclick=async()=>{
 const user=auth.currentUser;if(!user)return;
 krogerConnectButton.disabled=true;krogerStatus.textContent='Opening Kroger sign-in…';
 try{const result=await krogerRequest(user,'/connect',{method:'POST'});if(auth.currentUser?.uid!==user.uid)return;
  window.location.assign(result.authorizationUrl);
 }catch(error){krogerDisplay(error.message||'Unable to start Kroger connection.');}
};
krogerDisconnectButton.onclick=async()=>{
 const user=auth.currentUser;if(!user)return;
 krogerDisconnectButton.disabled=true;krogerStatus.textContent='Disconnecting Kroger…';
 try{await krogerRequest(user,'/disconnect',{method:'POST'});if(auth.currentUser?.uid!==user.uid)return;
  krogerDisplay('Kroger disconnected. Your grocery list is unchanged.');
 }catch(error){krogerDisplay(error.message||'Could not disconnect Kroger.',true);}
};

const optionalToggle=document.querySelector('#luxuryOptionalToggle'),optionalDetails=document.querySelector('#luxuryOptionalDetails');
const setOptionalExpanded=expanded=>{optionalDetails.hidden=!expanded;optionalToggle.setAttribute('aria-expanded',String(expanded))};
optionalToggle.onclick=()=>setOptionalExpanded(optionalDetails.hidden);

const diagnosisPanel=document.querySelector('#luxuryRecoveryPanel');
const diagnosisOutput=document.querySelector('#luxuryDiagnosticResults');
document.querySelector('#luxuryInspectPlan').onclick=async()=>{
 const user=auth.currentUser,epoch=authEpoch;
 if(!user){diagnosisOutput.textContent='Sign in using the profile icon first.';return}
 diagnosisOutput.textContent='Checking saved Firebase record…';
 try{
  const snap=await getDocFromServer(doc(db,'users',user.uid));
  if(epoch!==authEpoch||auth.currentUser?.uid!==user.uid)return;
  const result=diagnoseSavedPlan(snap.exists()?snap.data():null);
  diagnosisOutput.textContent='Cloud document: '+result.document+
   '\\nPreferences: '+result.preferences+
   '\\nWeek 1: '+result.week1.meals+' selected meals across '+result.week1.days+' days'+
   '\\nWeek 2: '+result.week2.meals+' selected meals across '+result.week2.days+' days'+
   '\\nWeek 1 structure: '+(result.week1.valid?'readable':'needs review')+
   '\\nWeek 2 structure: '+(result.week2.valid?'readable':'needs review')+
   '\\n'+result.recovery+'\\nNo changes were made.';
 }catch{
  if(epoch===authEpoch&&auth.currentUser?.uid===user.uid)diagnosisOutput.textContent='Could not read account from Firebase. No changes were made.';
 }
};
const accountPanel=document.querySelector('#luxuryAccountPanel');
const authMessage=document.querySelector('#luxuryAuthMessage');
const authForm=document.querySelector('#luxurySignInForm');
const authPassword=document.querySelector('#luxuryPassword');
document.querySelector('.profile').onclick=()=>{accountPanel.hidden=!accountPanel.hidden;diagnosisPanel.hidden=!auth.currentUser||accountPanel.hidden;authForm.hidden=!!auth.currentUser;document.querySelector('#luxurySignOut').hidden=!auth.currentUser;authMessage.textContent=auth.currentUser?'Signed in. Your saved meals are read-only in this preview.':'Sign in to load your saved Tablewise account.';if(!accountPanel.hidden)accountPanel.scrollIntoView({block:'start'})};
document.querySelector('#luxuryCloseAccount').onclick=()=>{accountPanel.hidden=true;diagnosisPanel.hidden=true;authPassword.value=''};
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
const label=(message)=>{previewNotice.textContent=message;previewNotice.hidden=!message};
const customRecipes=()=>{let raw=account?.custom||[];if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch{return []}}return Array.isArray(raw)?raw:[]};
const findRecipe=(id)=>baseRecipes.get(id)||customRecipes().find(r=>r.id===id);
const photo=(id)=>{const path=verifiedRecipePhotos[id];return path?(path.startsWith('assets/')?'../'+path:path):''};
const planFor=(week)=>{const state=effectiveAccount();if(!state)return null;const active=state.activePlanningWeek===2?2:1;return week===active?state.plan:state.alternateWeek?.plan};
const dayMeal=(week,day,slot)=>{const row=planFor(week)?.[day];return findRecipe(row?.[slot])||null};
const formatAmount=(n,unit)=>{const amount=Number(n);return (Number.isFinite(amount)?(Math.round(amount*100)/100):n)+' '+(unit||'')};
const setHero=()=>{const dinner=dayMeal(account?.activePlanningWeek===2?2:1,new Date().getDay(),2);const heading=document.querySelector('.hero-copy h2'),subtitle=document.querySelector('.hero-copy .muted'),picture=document.querySelector('.hero-photo');if(!heading||!subtitle||!picture)return;heading.textContent=dinner?.name||'No dinner planned today';subtitle.textContent=dinner?recipeSummary(dinner).description+' · '+recipeSummary(dinner).time:'No dinner scheduled in your saved plan';picture.style.backgroundImage=dinner&&photo(dinner.id)?'linear-gradient(transparent 35%,#10271ed9),url("'+photo(dinner.id)+'")':'none';const cookButton=document.querySelector('.hero .primary');if(cookButton)cookButton.onclick=()=>dinner?openRecipe(dinner):showPage('week')};
const renderWeek=(week)=>{liveWeek=Number(week)||1;const list=document.querySelector('#days');if(!list)return;list.replaceChildren();for(let day=0;day<7;day++){const meal=dayMeal(liveWeek,day,2);const card=document.createElement('div');card.className='day';const dayLabel=document.createElement('strong');dayLabel.textContent=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day];card.append(dayLabel);if(meal&&photo(meal.id)){const img=document.createElement('img');img.src=photo(meal.id);img.alt='';img.loading='lazy';card.append(img)}const body=document.createElement('div'),name=document.createElement('strong'),small=document.createElement('small');name.textContent=meal?.name||'No dinner planned';small.textContent=meal?(hasPreviewEdits(previewEdits)?'Preview plan · not saved':'Saved recipe'):'No meal scheduled';body.append(name,document.createElement('br'));if(meal){const details=recipeSummary(meal),desc=document.createElement('span'),time=document.createElement('small');desc.className='recipe-description';desc.textContent=details.description;time.className='recipe-time';time.textContent=details.time;body.append(desc,time)}body.append(small);card.append(body);if(meal){const button=document.createElement('button');button.className='view-recipe';button.textContent='›';button.setAttribute('aria-label','View '+meal.name);button.onclick=()=>openRecipe(meal);card.append(button)}const edit=document.createElement('button');edit.className='change-meal';edit.textContent='Change';edit.setAttribute('aria-label','Preview another dinner for '+dayLabel.textContent);edit.onclick=()=>openMealPicker(liveWeek,day);card.append(edit);list.append(card)}};
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
 if(!account)return;
 const picker=document.querySelector('#luxuryMealPicker'),options=document.querySelector('#luxuryMealChoices');
 const search=document.querySelector('#luxuryMealSearch'),tabs=document.querySelector('#luxuryMealTabs');
 const count=document.querySelector('#luxuryMealCount'),more=document.querySelector('#luxuryLoadMoreMeals');
 let category='All',limit=3;
 search.value='';tabs.replaceChildren();
 const draw=()=>{
  const found=searchMeals(recipes,{query:search.value,category,slot:'Dinner'});
  options.replaceChildren();
  for(const recipe of found.slice(0,limit)){
   const button=document.createElement('button');button.type='button';button.className='grocery-item';
   const photoUrl=photo(recipe.id);if(photoUrl){const image=document.createElement('img');image.className='picker-meal-photo';image.src=photoUrl;image.alt='';image.loading='lazy';button.append(image)}
   const content=document.createElement('div');content.className='picker-meal-copy';const heading=document.createElement('strong');heading.textContent=recipe.name;
   const details=document.createElement('small');details.textContent=[recipe.cuisine||'Dinner',recipe.cal?recipe.cal+' cal':''].filter(Boolean).join(' · ');
   const nutrition=document.createElement('small');nutrition.className='picker-macros';nutrition.textContent=[recipe.p!=null?recipe.p+'g protein':'',recipe.c!=null?recipe.c+'g carbs':'',recipe.f!=null?recipe.f+'g fat':''].filter(Boolean).join(' · ');
   content.append(heading,details,nutrition);
   const add=document.createElement('span');add.className='picker-meal-add';add.textContent='+';add.setAttribute('aria-hidden','true');
   button.append(content,add);
   button.onclick=()=>{previewEdits=replacePreviewMeal(account,previewEdits,week,day,2,recipe.id);picker.hidden=true;refreshDiscard();renderWeek(week);setHero();renderIngredients();label('Preview updated. Grocery quantities recalculated. Meal changes are not saved to your account.')};
   options.append(button);
  }
  count.textContent=found.length+' matching meals';
  if(!found.length){const empty=document.createElement('p');empty.className='notice';empty.textContent='No matching meals. Try another ingredient or category.';options.append(empty)}
  more.hidden=found.length<=limit;
  for(const tab of tabs.querySelectorAll('button'))tab.setAttribute('aria-pressed',String(tab.textContent===category));
 };
 for(const name of ['All','Mexican','Chicken','Beef','Pork',...mealCategories.filter(name=>!['All','Mexican','Chicken','Beef','Pork'].includes(name))]){const button=document.createElement('button');button.type='button';button.textContent=name;if(['All','Mexican','Chicken','Beef','Pork'].includes(name)){
  button.className='picker-featured-tab';
  if(name!=='All'){
   const exemplar=searchMeals(recipes,{category:name,slot:'Dinner'}).find(item=>photo(item.id));
   const url=exemplar&&photo(exemplar.id);
   if(url){const image=document.createElement('img');image.className='picker-category-photo';image.src=url;image.alt='';image.loading='lazy';button.prepend(image)}
  }
 }button.onclick=()=>{category=name;limit=3;draw()};tabs.append(button)}
 search.oninput=()=>{limit=3;draw()};more.onclick=()=>{limit+=3;draw()};
 document.querySelector('#cancelLuxuryMealPicker').onclick=()=>{picker.hidden=true};
 document.querySelector('#luxuryPickerClose').onclick=()=>{picker.hidden=true};
 draw();picker.hidden=false;picker.scrollIntoView({block:'nearest'});
};
const showCookStep=()=>{const count=document.querySelector('#stepCount'),title=document.querySelector('#cookStepTitle'),body=document.querySelector('#cookStepBody');const items=currentRecipe?.steps||[];const n=items.length;count.textContent=n?'Step '+(step+1)+' of '+n:'No cooking steps available';title.textContent=currentRecipe?.name||'Select a meal';body.textContent=items[step]||'Open a saved recipe to view its cooking instructions.';document.querySelector('#previousStep').disabled=step===0;document.querySelector('#nextStep').disabled=!n;document.querySelector('#nextStep').textContent=step===n-1?'Done':'Next'};
const openRecipe=(recipe)=>{currentRecipe=recipe;step=0;const img=document.querySelector('.cook-photo');const url=photo(recipe.id);if(url){img.src=url;img.alt=recipe.name;img.hidden=false}else img.hidden=true;showCookStep();showPage('cook')};
const groceryExpansion={week:null,categories:{}};
const groceryExpandedKey=()=>accountUid?'tablewise:grocery-expanded:v1:'+accountUid:null;
const restoreGroceryExpansion=()=>{groceryExpansion.week=null;groceryExpansion.categories={};const key=groceryExpandedKey();if(!key)return;try{const value=JSON.parse(localStorage.getItem(key)||'null');if(value&&['both','1','2',null].includes(value.week)){groceryExpansion.week=value.week;if(value.categories&&typeof value.categories==='object'&&!Array.isArray(value.categories)){for(const [w,states] of Object.entries(value.categories)){if(!['both','1','2'].includes(w)||!states||typeof states!=='object')continue;groceryExpansion.categories[w]={};for(const [name,open] of Object.entries(states))if(name.length<100&&typeof open==='boolean')groceryExpansion.categories[w][name]=open}}}}}catch{}};
const saveGroceryExpansion=()=>{const key=groceryExpandedKey();if(key)try{localStorage.setItem(key,JSON.stringify(groceryExpansion))}catch{}};
const renderGroceryPanel=(week)=>{
 const host=document.querySelector('#groceryWeekContent');
 if(!host)return;host.replaceChildren();
 if(!account||!accountUid){host.textContent='Sign in to view your grocery list.';return}
 const rows=groceryTotals(effectiveAccount(),findRecipe,week==='both'?[1,2]:[Number(week)]);
 const checks=readChecklist(localStorage,accountUid,week,rows);
 const summary=document.createElement('div');summary.className='grocery-summary';
 const heading=document.createElement('strong');const clear=document.createElement('button');clear.type='button';clear.className='primary';clear.textContent='Uncheck all';
 const updateHeading=()=>{const checked=Object.values(checks).filter(Boolean).length;heading.textContent=checked+' of '+rows.length+' checked';};
 const persist=()=>saveChecklist(localStorage,accountUid,week,rows,checks);
 summary.append(heading,clear);host.append(summary);
 if(!rows.length){const empty=document.createElement('p');empty.className='notice';empty.textContent='No planned ingredients for this period.';host.append(empty);clear.hidden=true}
 for(const [category,items] of groupGroceryItems(rows)){
  const panel=document.createElement('details');panel.className='grocery-category';panel.open=groceryExpansion.categories[week]?.[category]??false;
  panel.addEventListener('toggle',()=>{if(groceryExpansion.week!==week)return;(groceryExpansion.categories[week]??={})[category]=panel.open;saveGroceryExpansion()});
  const title=document.createElement('summary');title.textContent=category;panel.append(title);
  for(const item of items){
   const key=groceryKey(item),row=document.createElement('button');row.type='button';row.className='grocery-item';row.setAttribute('aria-pressed',String(!!checks[key]));
   const marker=document.createElement('span'),caption=document.createElement('span'),amount=document.createElement('span');
   marker.setAttribute('aria-hidden','true');caption.className='grocery-name';caption.textContent=item.name;
   amount.className='grocery-quantity';amount.textContent=formatAmount(item.quantity,item.unit);
   const paint=()=>{row.classList.toggle('checked',!!checks[key]);row.setAttribute('aria-pressed',String(!!checks[key]));marker.textContent=checks[key]?'☑':'□'};
   row.onclick=()=>{checks[key]=!checks[key];if(!persist())label('Grocery checks could not be saved on this device.');paint();updateHeading()};
   paint();row.append(marker,caption,amount);panel.append(row);
  }
  host.append(panel);
 }
 clear.onclick=()=>{for(const key of Object.keys(checks))delete checks[key];if(!persist())label('Grocery checks could not be saved on this device.');renderGroceryPanel(week)};
 updateHeading();
};
let groceryOpenWeek=null;
const updateGroceryTabs=()=>document.querySelectorAll('[data-grocery-panel]').forEach(button=>{const open=button.dataset.groceryPanel===groceryOpenWeek;button.classList.toggle('active',open);button.setAttribute('aria-expanded',String(open));});
const renderIngredients=(scope='plan')=>{
 resetKrogerMatches();
 const host=document.querySelector('#groceryItems');host.replaceChildren();
 const heading=document.querySelector('#groceryCount'),clear=document.querySelector('#clearGroceries');clear.hidden=true;
 if(scope==='recipe'&&currentRecipe){
  groceryOpenWeek=null;document.querySelector('#groceryWeekContent').replaceChildren();updateGroceryTabs();
  host.hidden=false;heading.textContent=(currentRecipe.ingredients?.length||0)+' recipe ingredients';
  for(const [name,quantity,unit] of currentRecipe.ingredients||[]){const row=document.createElement('div');row.className='grocery-item';row.textContent=name+' — '+formatAmount(quantity,unit);host.append(row)}
 }else{host.hidden=true;updateGroceryTabs();const content=document.querySelector('#groceryWeekContent');if(groceryOpenWeek)renderGroceryPanel(groceryOpenWeek);else content.replaceChildren();}
};
document.querySelectorAll('[data-grocery-panel]').forEach(button=>button.addEventListener('click',()=>{
 groceryOpenWeek=groceryOpenWeek===button.dataset.groceryPanel?null:button.dataset.groceryPanel;
 groceryExpansion.week=groceryOpenWeek;saveGroceryExpansion();renderIngredients();
}));
document.querySelector('#previousStep').onclick=()=>{step=Math.max(0,step-1);showCookStep()};
document.querySelector('#nextStep').onclick=()=>{if(step+1>=(currentRecipe?.steps?.length||0)){showPage('today');return}step++;showCookStep()};
document.querySelector('section[data-page="cook"] > button.primary.full').onclick=()=>{renderIngredients('recipe');showPage('groceries')};
document.querySelectorAll('[data-nav="groceries"]').forEach(b=>b.addEventListener('click',()=>renderIngredients()));
document.querySelectorAll('[data-week]').forEach(b=>b.addEventListener('click',()=>{if(account)renderWeek(b.dataset.week)}));
const resetPrivateView=()=>{
 // Clear all previous account content synchronously, before any next-account fetch.
 ++krogerEpoch;clearKrogerProducts();krogerDisplay('Sign in to Tablewise to connect your Kroger account.');
 account=null;accountUid=null;diagnosisPanel.hidden=true;diagnosisOutput.textContent='';currentRecipe=null;step=0;previewEdits={};liveWeek=1;groceryWeek='both';groceryOpenWeek=null;groceryExpansion.week=null;groceryExpansion.categories={};
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
 setOptionalExpanded(false);
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
onAuthStateChanged(auth,async user=>{const epoch=++authEpoch;resetPrivateView();if(user){restoreKrogerStore(user);void refreshKroger();}if(!user){label('Sign in using the profile icon to load your saved Tablewise meals. Cloud saving is disabled in this preview.');return}label('Loading your saved plan securely…');try{const snapshot=await getDocFromServer(doc(db,'users',user.uid));if(epoch!==authEpoch)return;if(!snapshot.exists()){label('Your saved cloud plan was not found. Nothing has been modified. Your account needs recovery before this preview can display saved meals.');return}const loaded=snapshot.data();if(!loaded.plan||typeof loaded.plan!=='object'||Array.isArray(loaded.plan)){label('Your saved meal plan could not be verified. Nothing has been changed. Please check your original Tablewise account.');return}const needsPreferencesRecovery=!loaded.preferences&&!loaded.onboardingInitialized;account=loaded;accountUid=user.uid;restoreGroceryExpansion();groceryOpenWeek=groceryExpansion.week;refreshRecovered();label(needsPreferencesRecovery?'Your preferences may need recovery. Existing saved meals are shown read-only where available; nothing will be written to Firebase. Check your original Tablewise app before changing your plan.':null);liveWeek=account.activePlanningWeek===2?2:1;document.querySelectorAll('[data-week]').forEach(b=>b.classList.toggle('active',Number(b.dataset.week)===liveWeek));setHero();renderWeek(liveWeek);const weekHint=document.querySelector('[data-page="week"]>.muted');if(weekHint)weekHint.textContent='Choose Change to preview a different dinner. Preview changes are not saved.';const meals=document.querySelectorAll('[data-optional-meal]');let hasOptionalMeal=false;for(let i=0;i<meals.length;i++){const recipe=dayMeal(liveWeek,new Date().getDay(),i);const small=meals[i].querySelector('small');if(small)small.textContent=recipe?.name||'Not planned';if(recipe)hasOptionalMeal=true;meals[i].onclick=()=>recipe?openRecipe(recipe):showPage('week')}optionalToggle.hidden=hasOptionalMeal;setOptionalExpanded(hasOptionalMeal);renderIngredients()}catch(error){if(epoch!==authEpoch)return;label('Could not read your saved plan. No changes were made. Check your connection and try again.');console.error('Luxury preview read failed',error)}});
