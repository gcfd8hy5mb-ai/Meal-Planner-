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
 nuts:{description:'A simple mix of nuts and raisins',prepMinutes:2,cookMinutes:0},
 pancakes:{"description":"Fluffy skillet pancakes finished with maple syrup","prepMinutes":5,"cookMinutes":12},
 omelet:{"description":"A tender cheddar and spinach egg omelet","prepMinutes":5,"cookMinutes":7},
 frenchtoast:{"description":"Golden cinnamon French toast made with whole-grain bread","prepMinutes":5,"cookMinutes":6},
 burrito:{"description":"A warm breakfast tortilla filled with eggs, potatoes and cheddar","prepMinutes":8,"cookMinutes":17},
 bagel:{"description":"A toasted bagel stacked with egg, cheddar and turkey","prepMinutes":5,"cookMinutes":6},
 cereal:{"description":"Whole-grain cereal with banana and milk","prepMinutes":3,"cookMinutes":0},
 tacos:{"description":"Chicken street tacos with onion, cilantro and lime","prepMinutes":10,"cookMinutes":10},
 quesadilla:{"description":"Crisp black bean and cheddar quesadillas with salsa","prepMinutes":5,"cookMinutes":6},
 friedrice:{"description":"Chicken fried rice with egg, vegetables and soy sauce","prepMinutes":10,"cookMinutes":15},
 noodles:{"description":"Garlic and scallion noodles tossed in sesame soy sauce","prepMinutes":5,"cookMinutes":12},
 soup:{"description":"Chicken and vegetable noodle soup in warm broth","prepMinutes":10,"cookMinutes":20},
 sandwich:{"description":"A grilled chicken sandwich with lettuce, tomato and mayo","prepMinutes":8,"cookMinutes":15},
 fajitas:{"description":"Sizzling chicken strips with peppers and onion in tortillas","prepMinutes":10,"cookMinutes":15},
 enchiladas:{"description":"Baked black bean and cheddar enchiladas with sauce","prepMinutes":10,"cookMinutes":25},
 stirfry:{"description":"Ginger chicken with broccoli and peppers over rice","prepMinutes":10,"cookMinutes":15},
 beefbroccoli:{"description":"Seared beef and tender broccoli over rice with garlic soy sauce","prepMinutes":10,"cookMinutes":12},
 spaghetti:{"description":"Spaghetti with browned beef meatballs and tomato sauce","prepMinutes":10,"cookMinutes":22},
 chickenparm:{"description":"Baked breadcrumb chicken with mozzarella, tomato sauce and pasta","prepMinutes":10,"cookMinutes":25},
 waffles:{"description":"Golden waffles served with maple syrup","prepMinutes":5,"cookMinutes":5},
 scramble:{"description":"Soft eggs scrambled with pepper, spinach and cheddar","prepMinutes":5,"cookMinutes":8},
 parfait:{"description":"Layered Greek yogurt, granola and fresh strawberries","prepMinutes":5,"cookMinutes":0},
 breakfastsand:{"description":"An English muffin with cooked egg, turkey and cheddar","prepMinutes":5,"cookMinutes":6},
 bowlmex:{"description":"Chicken burrito bowl with rice, black beans, lettuce and salsa","prepMinutes":10,"cookMinutes":10},
 shrimpTacos:{"description":"Shrimp tacos with crunchy cabbage and a yogurt-lime topping","prepMinutes":10,"cookMinutes":8},
 dumpling:{"description":"Vegetable dumplings over warm cabbage and carrots with soy","prepMinutes":10,"cookMinutes":12},
 orangeChicken:{"description":"Orange-soy glazed chicken, broccoli and rice","prepMinutes":10,"cookMinutes":15},
 teriyaki:{"description":"Oven-baked teriyaki salmon with rice and broccoli","prepMinutes":5,"cookMinutes":16},
 greekwrap:{"description":"Greek-style chicken pita with cucumber, tomato and tzatziki","prepMinutes":10,"cookMinutes":15},
 medbowl:{"description":"Chickpeas, rice, cucumber, tomato and feta with olive oil","prepMinutes":10,"cookMinutes":5},
 burgers:{"description":"Turkey burgers with fresh toppings and oven-roasted potato wedges","prepMinutes":10,"cookMinutes":30}
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
