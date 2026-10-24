const categories=[
 ['Produce',/pepper|onion|garlic|tomato|lettuce|spinach|broccoli|carrot|potato|banana|apple|lemon|lime|cilantro|avocado|mushroom|zucchini|cucumber|berries|strawberr|celery|cabbage|asparagus|salad|fruit/i],
 ['Meat & Seafood',/chicken|beef|steak|turkey|pork|bacon|sausage|shrimp|salmon|fish|ground meat|hamburger/i],
 ['Dairy & Eggs',/milk|cheese|cream|yogurt|butter|egg|mozzarella|cheddar|parmesan/i],
 ['Bread & Bakery',/bread|bun|roll|tortilla|bagel|pita|toast/i],
 ['Pantry & Dry Goods',/rice|pasta|noodle|flour|sugar|oil|vinegar|bean|lentil|oat|cereal|sauce|salsa|seasoning|spice|salt|pepper powder|broth|stock|honey|peanut butter|tomato paste/i],
 ['Frozen',/frozen|ice cream/i],
 ['Beverages',/juice|soda|coffee|tea|drink|water/i]
];
export function groceryCategory(name){if(/frozen|ice cream/i.test(name||''))return 'Frozen';if(/(?:cream of (?:mushroom|chicken|celery|tomato) soup|canned soup|condensed soup|diced tomatoes|crushed tomatoes|stewed tomatoes|tomato sauce|tomato paste|canned tomatoes|canned mushrooms|canned vegetables|canned beans)/i.test(name||''))return 'Pantry & Dry Goods';if(/ground pepper|black pepper|white pepper|pepper powder|peppercorn|coconut milk|canned milk|evaporated milk/i.test(name||''))return 'Pantry & Dry Goods';for(const [category,pattern] of categories)if(pattern.test(name||''))return category;return 'Other';}
export function groupGroceryItems(rows){const groups=new Map();for(const row of rows){const name=groceryCategory(row.name);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(row)}return [...groups].sort((a,b)=>{const index=n=>categories.findIndex(x=>x[0]===n);const i=index(a[0]),j=index(b[0]);return (i<0?99:i)-(j<0?99:j)});}
