const categories=['All','Southern','Mexican','Chicken','Beef','Pork','Seafood','Pasta','Vegetarian'];
export const mealCategories=categories;
const norm=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const aliases={mexican:['mexican','tex-mex','tex mex','taco','burrito','enchilada','fajita','quesadilla','salsa','cilantro'],seafood:['fish','salmon','shrimp','tuna','catfish','seafood'],vegetarian:['vegetarian','veggie','tofu','beans','lentil'],pasta:['pasta','spaghetti','macaroni','noodle','penne','lasagna'],chicken:['chicken','poultry'],beef:['beef','steak','burger','hamburger'],pork:['pork','bacon','ham','sausage'],southern:['southern','south','cajun','creole']};
export function searchMeals(recipes,{query='',category='All',slot='Dinner'}={}){
 const term=norm(query);const terms=term.split(/\s+/).filter(Boolean);
 return recipes.filter(recipe=>{
  if(slot&&recipe.slot!==slot)return false;
  const ingredients=(recipe.ingredients||[]).map(i=>i[0]).join(' ');
  const searchable=norm([recipe.name,recipe.cuisine,ingredients].join(' '));
  const tags=[norm(recipe.name),norm(recipe.cuisine),norm(ingredients)].join(' ');
  const match=word=>searchable.includes(word)||(aliases[word]||[]).some(t=>tags.includes(t));
  const selected=norm(category);
  return (selected==='all'||match(selected))&&terms.every(match);
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
