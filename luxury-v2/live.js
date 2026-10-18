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
import {suggestedKrogerPackages} from './kroger-packages.mjs';
import {readKrogerStore,saveKrogerStore} from './kroger-store.mjs';
import {krogerPriceSummary,sortKrogerOffers,krogerPromotionCoverage,sortKrogerIngredientMatches,krogerIngredientRelevance} from './kroger-pricing.mjs';
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
let krogerActionEpoch=0,krogerActionPending=false;
let krogerKnownConnected=false;
const krogerDisplay=(message,connected=false)=>{
 krogerKnownConnected=connected;
 krogerStatus.textContent=message;
 krogerConnectButton.hidden=connected;
 productPanel.hidden=!connected;if(!connected)clearKrogerProducts({keepStore:true});
 krogerDisconnectButton.hidden=!connected;
 krogerDisconnectButton.disabled=!auth.currentUser||!connected;
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
 if(krogerCartPending)return;
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
 if(krogerCartPending){krogerStoreSelect.value=krogerLocationId;return}
 krogerLocationId=krogerStoreSelect.value;
 resetKrogerMatches();++productSearchEpoch;selectedKroger.clear();renderKrogerSelection();productResults.replaceChildren();productMessage.textContent='';
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
const clearKrogerProducts=({keepStore=false}={})=>{++cartSubmissionEpoch;krogerCartPending=false;document.querySelector('#krogerAddCartButton').disabled=false;krogerStoreSelect.disabled=false;document.querySelector('#krogerFindStores').disabled=false;if(!keepStore)clearStoreResults();resetKrogerMatches();++productSearchEpoch;selectedKroger.clear();productResults.replaceChildren();cartReview.hidden=true;productPanel.hidden=true};
const renderKrogerSelection=()=>{
 cartReview.hidden=!selectedKroger.size;
 const count=document.querySelector('#krogerCartSelection'),list=document.querySelector('#krogerQuantityList');
 count.textContent=selectedKroger.size+' distinct products · '+[...selectedKroger.values()].reduce((total,item)=>total+item.quantity,0)+' total packages selected. Verify quantities before adding to Kroger.';
 list.replaceChildren();
 for(const [upc,item] of selectedKroger){
  const row=document.createElement('div');row.className='kroger-result';
  const label=document.createElement('label');label.textContent=item.name||('Product '+upc);
  const quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.max='30';quantity.step='1';quantity.inputMode='numeric';quantity.value=String(item.quantity);quantity.disabled=krogerCartPending;
  const inputId='kroger-quantity-'+upc;quantity.id=inputId;label.htmlFor=inputId;
  quantity.setAttribute('aria-label','Packages for '+(item.name||upc));
  quantity.onchange=()=>{
   const value=Number(quantity.value);
   if(!Number.isSafeInteger(value)||value<1||value>30){quantity.value=String(item.quantity);productMessage.textContent='Enter a whole number from 1 to 30 packages.';return}
   item.quantity=value;count.textContent=selectedKroger.size+' distinct products · '+[...selectedKroger.values()].reduce((total,entry)=>total+entry.quantity,0)+' total packages selected. Verify quantities before adding to Kroger.';
  };
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.disabled=krogerCartPending;remove.setAttribute('aria-label','Remove '+(item.name||upc)+' from Kroger selection');remove.onclick=()=>{if(krogerCartPending)return;selectedKroger.delete(upc);renderKrogerSelection()};
  row.append(label,quantity,remove);list.append(row);
 }
};
document.querySelector('#krogerSearchButton').onclick=async()=>{
 const user=auth.currentUser;if(!user)return;
 const term=document.querySelector('#krogerProductTerm').value.trim();if(term.length<2){productMessage.textContent='Enter at least two characters.';return}
 if(!krogerLocationId){productMessage.textContent='Choose your Kroger store first.';return}
 const epoch=++productSearchEpoch,searchStore=krogerLocationId;productMessage.textContent='Searching products…';productResults.replaceChildren();
 try{const data=await krogerRequest(user,'/products',{params:{term,locationId:searchStore}});
  if(epoch!==productSearchEpoch||auth.currentUser?.uid!==user.uid||krogerLocationId!==searchStore)return;
  for(const item of data.products||[]){
   const row=document.createElement('div');row.className='kroger-result';
   const info=document.createElement('div'),title=document.createElement('strong'),details=document.createElement('small');
   title.textContent=item.name;const offer=krogerPriceSummary(item);
   details.textContent=[item.brand,item.size,offer.label].filter(Boolean).join(' / ');
   info.append(title,details);
   const button=document.createElement('button');button.type='button';button.textContent=selectedKroger.has(item.upc)?'Remove':'Select';
   button.onclick=()=>{if(krogerCartPending)return;if(selectedKroger.has(item.upc))selectedKroger.delete(item.upc);else selectedKroger.set(item.upc,{upc:item.upc,name:item.name,quantity:1});button.textContent=selectedKroger.has(item.upc)?'Remove':'Select';renderKrogerSelection()};
   row.append(info,button);productResults.append(row);
  }
  productMessage.textContent=krogerPromotionCoverage(data.products);
 }catch(error){if(epoch===productSearchEpoch)productMessage.textContent=error.message||'Search unavailable.'}
};
let krogerCartPending=false,cartSubmissionEpoch=0;
document.querySelector('#krogerAddCartButton').onclick=async()=>{
 const user=auth.currentUser;if(!user||!selectedKroger.size||krogerCartPending)return;
 const items=[...selectedKroger.values()].map(({upc,quantity})=>({upc,quantity}));
 const storeAtSubmit=krogerLocationId;
 if(!storeAtSubmit){productMessage.textContent='Choose your Kroger store first.';return}
 if(items.length>20){productMessage.textContent='Select 20 or fewer products per cart update.';return}
 if(items.some(item=>!/^\d{8,14}$/.test(String(item.upc||''))||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>30)){productMessage.textContent='One or more selected products have an invalid code or package quantity. Remove and reselect those products before continuing.';return}
 const totalPackages=items.reduce((sum,item)=>sum+item.quantity,0);
 if(!window.confirm('Add '+items.length+' distinct products ('+totalPackages+' total packages) to your Kroger cart? Verify quantities before continuing. This will not place an order.'))return;
 const submissionEpoch=++cartSubmissionEpoch;const button=document.querySelector('#krogerAddCartButton');krogerCartPending=true;button.disabled=true;krogerStoreSelect.disabled=true;document.querySelector('#krogerFindStores').disabled=true;renderKrogerSelection();productMessage.textContent='Updating cart…';
 try{
  const result=await krogerRequest(user,'/cart/add',{method:'POST',body:{items}});
  if(submissionEpoch!==cartSubmissionEpoch||auth.currentUser?.uid!==user.uid||krogerLocationId!==storeAtSubmit)return;
  productMessage.textContent=result.message||'Cart updated. Review in Kroger.';
  for(const item of items){const current=selectedKroger.get(item.upc);if(current?.quantity===item.quantity)selectedKroger.delete(item.upc)}
  renderKrogerSelection();
 }catch(error){if(submissionEpoch===cartSubmissionEpoch&&auth.currentUser?.uid===user.uid&&krogerLocationId===storeAtSubmit)productMessage.textContent='Kroger cart update was not confirmed. Your selection is still here. Check your Kroger cart before retrying to avoid adding products twice.'}
 finally{if(submissionEpoch===cartSubmissionEpoch){krogerCartPending=false;button.disabled=false;krogerStoreSelect.disabled=false;document.querySelector('#krogerFindStores').disabled=false;renderKrogerSelection()}}
};
const krogerMatchButton=document.querySelector('#krogerMatchList');
const krogerMatchMore=document.querySelector('#krogerMatchMore');
const krogerMatchProgress=document.querySelector('#krogerMatchProgress');
const krogerMatchResults=document.querySelector('#krogerMatchResults');
let matchEpoch=0,matchQueue=[],matchPosition=0,matchFailures=0;
const resetKrogerMatches=()=>{++matchEpoch;matchQueue=[];matchPosition=0;matchFailures=0;krogerMatchResults.replaceChildren();krogerMatchMore.hidden=true;krogerMatchButton.disabled=false;krogerMatchProgress.textContent=''};
const appendKrogerMatch=(item,products,{failed=false}={})=>{
 const group=document.createElement('div');group.className='kroger-match-group';
 const heading=document.createElement('strong');heading.textContent=item.name+' — '+formatAmount(item.quantity,item.unit);
 group.append(heading);
 const quantityNote=document.createElement('small');quantityNote.textContent='Recipe amount shown above. When package sizes are comparable, Tablewise estimates the number to select; otherwise it defaults to 1 package. Always confirm the package label and cart quantity.';group.append(quantityNote);
 if(!products.length){const missing=document.createElement('p');missing.textContent=failed?'Kroger search failed for this ingredient. Retry the search or search manually.':'No matching Kroger products found. Try searching by name.';group.append(missing)}
 const relevant=sortKrogerIngredientMatches(item.name,products).filter(product=>krogerIngredientRelevance(item.name,product)>0);
 if(products.length&&!relevant.length){const warning=document.createElement('p');warning.textContent='No clearly matching product names returned. Search manually and check the label before selecting.';group.append(warning)}
 for(const product of relevant.slice(0,2)){
  const row=document.createElement('div');row.className='kroger-result';
  const details=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('small');
  name.textContent=product.name;const offer=krogerPriceSummary(product);
  const suggested=suggestedKrogerPackages(item,product.size);
  meta.textContent=[product.brand,product.size||'Package size not provided',offer.label,suggested?'Estimated '+suggested+' package'+(suggested===1?'':'s')+' needed; verify item size':'Confirm package quantity manually'].filter(Boolean).join(' / ');
  details.append(name,meta);
  const select=document.createElement('button');select.type='button';
  const paint=()=>{select.textContent=selectedKroger.has(product.upc)?'Remove':'Select'};
  select.onclick=()=>{if(krogerCartPending)return;if(selectedKroger.has(product.upc))selectedKroger.delete(product.upc);else selectedKroger.set(product.upc,{upc:product.upc,name:product.name,quantity:suggested??1});paint();renderKrogerSelection()};
  paint();row.append(details,select);group.append(row);
 }
 krogerMatchResults.append(group);
};
const loadKrogerMatches=async()=>{
 const user=auth.currentUser,epoch=matchEpoch,matchStore=krogerLocationId;if(!user)return;
 if(!krogerLocationId){krogerMatchProgress.textContent='Choose your Kroger store before matching products.';return}
 krogerMatchMore.hidden=true;krogerMatchButton.disabled=true;
 const stop=Math.min(matchQueue.length,matchPosition+5);
 while(matchPosition<stop){
  const item=matchQueue[matchPosition++];
  krogerMatchProgress.textContent='Matching '+matchPosition+' of '+matchQueue.length+' ingredients…';
  try{
   const result=await krogerRequest(user,'/products',{params:{term:item.name,locationId:matchStore}});
   if(epoch!==matchEpoch||auth.currentUser?.uid!==user.uid||krogerLocationId!==matchStore)return;
   appendKrogerMatch(item,result.products||[]);
  }catch{
   if(epoch!==matchEpoch||auth.currentUser?.uid!==user.uid||krogerLocationId!==matchStore)return;
   appendKrogerMatch(item,[],{failed:true});matchFailures++;
  }
 }
 if(epoch===matchEpoch){
  krogerMatchProgress.textContent='Reviewed '+matchPosition+' of '+matchQueue.length+' ingredients.'+(matchFailures?' '+matchFailures+' Kroger lookups failed; search these ingredients manually.':'')+' Product quantities are per package; check sizes before adding to cart.';
  krogerMatchMore.hidden=matchPosition>=matchQueue.length;krogerMatchButton.disabled=false;
 }
};
krogerMatchButton.onclick=()=>{
 if(!auth.currentUser||!account||!accountUid){krogerMatchProgress.textContent='Sign in and load your saved meal plan first.';return}
 resetKrogerMatches();
 if(!groceryOpenWeek){krogerMatchProgress.textContent='Open Both weeks, Week 1, or Week 2 before matching your groceries.';return}
 matchQueue=groceryTotals(effectiveAccount(),findRecipe,groceryOpenWeek==='both'?[1,2]:[Number(groceryOpenWeek)]);
 if(!matchQueue.length){krogerMatchProgress.textContent='No saved grocery ingredients to match.';return}
 void loadKrogerMatches();
};
krogerMatchMore.onclick=()=>{void loadKrogerMatches()};
const refreshKroger=async()=>{
 const epoch=++krogerEpoch,user=auth.currentUser;
 if(!user){krogerDisplay('Sign in to Tablewise to connect your Kroger account.');return}
 krogerStatus.textContent='Checking Kroger connection…';
 krogerConnectButton.disabled=true;krogerDisconnectButton.disabled=true;
 try{const result=await krogerRequest(user,'/status');if(epoch!==krogerEpoch||auth.currentUser?.uid!==user.uid)return;
  krogerDisplay(result.connected?'Kroger connected. Product selection will require your confirmation.':'Not connected. Connect to shop your grocery list at Kroger.',!!result.connected);
 }catch{if(epoch===krogerEpoch&&auth.currentUser?.uid===user.uid)krogerDisplay('Could not verify Kroger connection. Your last confirmed connection state is preserved. Try again.',krogerKnownConnected);}
};
// iOS can restore a suspended tab without triggering a fresh Firebase auth event.
// Recheck the authenticated Kroger status on return; never repeat an OAuth or cart POST.
let krogerLastReturnRefresh=0;
const refreshKrogerOnReturn=()=>{
 if(!auth.currentUser||document.visibilityState==='hidden'||krogerActionPending)return;
 const now=Date.now();
 if(now-krogerLastReturnRefresh<1500)return;
 krogerLastReturnRefresh=now;
 void refreshKroger();
};
window.addEventListener('pageshow',event=>{if(event.persisted)refreshKrogerOnReturn()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshKrogerOnReturn()});
krogerConnectButton.onclick=async()=>{
 const user=auth.currentUser;if(!user||krogerActionPending)return;
 // Invalidate any status check started before this action.
 const epoch=++krogerEpoch;
 const actionEpoch=++krogerActionEpoch;krogerActionPending=true;
 krogerConnectButton.disabled=true;krogerStatus.textContent='Opening Kroger sign-in…';
 try{const result=await krogerRequest(user,'/connect',{method:'POST'});if(epoch!==krogerEpoch||auth.currentUser?.uid!==user.uid)return;
  window.location.assign(result.authorizationUrl);
 }catch(error){if(epoch===krogerEpoch&&auth.currentUser?.uid===user.uid)krogerDisplay(error.message||'Unable to start Kroger connection.');}
 finally{if(actionEpoch===krogerActionEpoch)krogerActionPending=false;}
};
krogerDisconnectButton.onclick=async()=>{
 const user=auth.currentUser;if(!user||krogerActionPending)return;
 // Invalidate any status check started before this action.
 const epoch=++krogerEpoch;
 const actionEpoch=++krogerActionEpoch;krogerActionPending=true;
 krogerDisconnectButton.disabled=true;krogerStatus.textContent='Disconnecting Kroger…';
 try{await krogerRequest(user,'/disconnect',{method:'POST'});if(epoch!==krogerEpoch||auth.currentUser?.uid!==user.uid)return;
  krogerDisplay('Kroger disconnected. Your grocery list is unchanged.');
 }catch(error){
  if(epoch!==krogerEpoch||auth.currentUser?.uid!==user.uid)return;
  // A timeout can occur after the worker completed disconnect. Recheck the read-only
  // status endpoint rather than assuming the previous connection remains active.
  await refreshKroger();
  if(epoch+1!==krogerEpoch||auth.currentUser?.uid!==user.uid)return;
  if(krogerStatus.textContent.startsWith('Could not verify Kroger connection.'))krogerStatus.textContent='Disconnect result is uncertain. Check Kroger connection again before retrying. Your grocery list is unchanged.';
 }
 finally{if(actionEpoch===krogerActionEpoch)krogerActionPending=false;}
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
const restoreGroceryExpansion=()=>{
 groceryExpansion.week=null;groceryExpansion.categories={};
 const key=groceryExpandedKey();if(!key)return;
 try{
  const value=JSON.parse(localStorage.getItem(key)||'null');
  if(!value||!['both','1','2',null].includes(value.week))return;
  groceryExpansion.week=value.week;
  if(!value.categories||typeof value.categories!=='object'||Array.isArray(value.categories))return;
  for(const [week,states] of Object.entries(value.categories)){
   if(!['both','1','2'].includes(week)||!states||typeof states!=='object')continue;
   groceryExpansion.categories[week]={};
   for(const [name,open] of Object.entries(states)){
    if(name.length<100&&typeof open==='boolean')groceryExpansion.categories[week][name]=open;
   }
  }
 }catch{}
};
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
  // Save on the user's click before native <details> queues its asynchronous toggle.
  // Ignore delayed toggles from panels already removed during navigation/re-render.
  panel.addEventListener('toggle',()=>{if(!panel.isConnected||!host.contains(panel)||groceryExpansion.week!==week)return;(groceryExpansion.categories[week]??={})[category]=panel.open;saveGroceryExpansion()});
  const title=document.createElement('summary');title.textContent=category;
  title.addEventListener('click',()=>{if(groceryExpansion.week!==week)return;(groceryExpansion.categories[week]??={})[category]=!panel.open;saveGroceryExpansion()});
  panel.append(title);
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
  // Recipe ingredients are a temporary view, not a change to saved grocery week selection.
  document.querySelector('#groceryWeekContent').replaceChildren();
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
const resetPrivateView=(loadingUser=false)=>{
 // Clear all previous account content synchronously, before any next-account fetch.
 ++krogerEpoch;++krogerActionEpoch;krogerActionPending=false;clearKrogerProducts();krogerDisplay('Sign in to Tablewise to connect your Kroger account.');
 account=null;accountUid=null;diagnosisPanel.hidden=true;diagnosisOutput.textContent='';currentRecipe=null;step=0;previewEdits={};liveWeek=1;groceryWeek='both';groceryOpenWeek=null;groceryExpansion.week=null;groceryExpansion.categories={};
 document.querySelector('#luxuryRecoverActions').hidden=true;
 refreshDiscard();
 const picker=document.querySelector('#luxuryMealPicker');picker.hidden=true;
 document.querySelector('#luxuryMealChoices').replaceChildren();
 document.querySelector('#days').replaceChildren();
 const placeholder=document.createElement('p');placeholder.className='notice';placeholder.textContent='Sign in to view your saved two-week plan.';
 document.querySelector('#days').append(placeholder);
 document.querySelector('.hero-copy h2').textContent=loadingUser?'Loading your dinner…':'No dinner selected';
 document.querySelector('.hero-copy .muted').textContent=loadingUser?'Restoring your saved meal plan securely.':'Sign in to see your saved dinner.';
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
onAuthStateChanged(auth,async user=>{const epoch=++authEpoch;resetPrivateView(!!user);if(user){restoreKrogerStore(user);void refreshKroger();}if(!user){label('Sign in using the profile icon to load your saved Tablewise meals. Cloud saving is disabled in this preview.');return}label('Loading your saved plan securely…');try{const snapshot=await getDocFromServer(doc(db,'users',user.uid));if(epoch!==authEpoch)return;if(!snapshot.exists()){label('Your saved cloud plan was not found. Nothing has been modified. Your account needs recovery before this preview can display saved meals.');return}const loaded=snapshot.data();if(!loaded.plan||typeof loaded.plan!=='object'||Array.isArray(loaded.plan)){label('Your saved meal plan could not be verified. Nothing has been changed. Please check your original Tablewise account.');return}const needsPreferencesRecovery=!loaded.preferences&&!loaded.onboardingInitialized;account=loaded;accountUid=user.uid;restoreGroceryExpansion();groceryOpenWeek=groceryExpansion.week;refreshRecovered();label(needsPreferencesRecovery?'Your preferences may need recovery. Existing saved meals are shown read-only where available; nothing will be written to Firebase. Check your original Tablewise app before changing your plan.':null);liveWeek=account.activePlanningWeek===2?2:1;document.querySelectorAll('[data-week]').forEach(b=>b.classList.toggle('active',Number(b.dataset.week)===liveWeek));setHero();renderWeek(liveWeek);const weekHint=document.querySelector('[data-page="week"]>.muted');if(weekHint)weekHint.textContent='Choose Change to preview a different dinner. Preview changes are not saved.';const meals=document.querySelectorAll('[data-optional-meal]');let hasOptionalMeal=false;for(let i=0;i<meals.length;i++){const recipe=dayMeal(liveWeek,new Date().getDay(),i);const small=meals[i].querySelector('small');if(small)small.textContent=recipe?.name||'Not planned';if(recipe)hasOptionalMeal=true;meals[i].onclick=()=>recipe?openRecipe(recipe):showPage('week')}optionalToggle.hidden=hasOptionalMeal;setOptionalExpanded(hasOptionalMeal);renderIngredients()}catch(error){if(epoch!==authEpoch)return;label('Could not read your saved plan. No changes were made. Check your connection and try again.');console.error('Luxury preview read failed',error)}});
