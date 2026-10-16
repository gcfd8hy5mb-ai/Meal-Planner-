// Read-only presentation metadata; never mutates recipe quantities or saved meals.
// Explicitly supplied recipe metadata wins over concise catalog-derived fallback.
// First twelve foundational recipes reviewed against their actual ingredient lists and steps.
// Times are practical approximations, not laboratory-measured guarantees.
export const reviewedRecipeDetails={
 oats:{description:'Creamy overnight oats with yogurt and mixed berries',prepMinutes:5,cookMinutes:0},
 eggs:{description:'Whole-grain avocado toast topped with freshly cooked eggs',prepMinutes:5,cookMinutes:6},
 smoothie:{description:'A creamy banana, protein and peanut-butter smoothie',prepMinutes:5,cookMinutes:0},
 chicken:{description:'Chicken, brown rice and steamed broccoli',prepMinutes:10,cookMinutes:45},
 wrap:{description:'Turkey, hummus and fresh spinach in a whole-wheat wrap',prepMinutes:10,cookMinutes:0},
 salad:{description:'Chickpeas, cucumber, tomatoes and feta with olive oil',prepMinutes:10,cookMinutes:0},
 salmon:{description:'Oven-roasted salmon, sweet potatoes and green beans',prepMinutes:10,cookMinutes:31},
 pasta:{description:'Whole-wheat pasta with lean turkey, tomato and spinach',prepMinutes:10,cookMinutes:15},
 tofu:{description:'Chicken and crisp mixed vegetables with soy sauce over brown rice',prepMinutes:10,cookMinutes:45},
 yogurt:{description:'Greek yogurt topped with fresh mixed berries',prepMinutes:3,cookMinutes:0},
 apple:{description:'Fresh apple wedges with peanut butter for dipping',prepMinutes:5,cookMinutes:0},
 nuts:{description:'A simple mix of nuts and raisins',prepMinutes:2,cookMinutes:0}
};
const nice=s=>String(s||'').trim().replace(/\s+/g,' ');
export function recipeSummary(recipe){
 if(!recipe)return {description:'',time:''};
 const reviewed=reviewedRecipeDetails[recipe.id]||{};
 const description=nice(recipe.description||recipe.summary||reviewed.description)||
   ((recipe.ingredients||[]).slice(0,3).map(x=>nice(x[0]).toLowerCase()).filter(Boolean).join(', ').replace(/, ([^,]+)$/,' and $1'));
 const prep=Number(recipe.prepMinutes??recipe.prepTimeMinutes??reviewed.prepMinutes);
 const cook=Number(recipe.cookMinutes??recipe.cookTimeMinutes??reviewed.cookMinutes);
 const validPrep=Number.isFinite(prep)&&prep>0;
 const validCook=Number.isFinite(cook)&&cook>0;
 const time=(validPrep?'Prep '+prep+' min':'')+(validPrep&&validCook?' · ':'')+(validCook?'Cook '+cook+' min':'');
 return {description:description?description[0].toUpperCase()+description.slice(1)+'.':'Recipe details',time:time?(reviewedRecipeDetails[recipe.id]?'Approx. ':'')+time:'Prep and cook times being reviewed'};
}
