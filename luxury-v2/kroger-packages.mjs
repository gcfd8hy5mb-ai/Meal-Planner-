const factors={lb:16,oz:1,kg:35.27396195,g:0.03527396195,gal:128,qt:32,pt:16,cup:8,'fl oz':1,l:33.8140227,ml:0.0338140227,each:1,ct:1,count:1};
const kind={lb:'mass',oz:'mass',kg:'mass',g:'mass',gal:'volume',qt:'volume',pt:'volume',cup:'volume','fl oz':'volume',l:'volume',ml:'volume',each:'count',ct:'count',count:'count'};
export function suggestedKrogerPackages(ingredient,size){
 const needed=Number(ingredient?.quantity);
 const unit=String(ingredient?.unit||'').trim().toLowerCase();
 const cleaned=String(size||'').trim().toLowerCase();
 const match=/^(\d+(?:\.\d+)?)\s*(fl\s*oz|ounces?|oz|lbs?|pounds?|kg|grams?|g|gallons?|gal|quarts?|qt|pints?|pt|cups?|liters?|l|milliliters?|ml|each|count|ct)$/.exec(cleaned);
 if(!Number.isFinite(needed)||needed<=0||!match)return null;
 const aliases={lbs:'lb',pound:'lb',pounds:'lb',ounce:'oz',ounces:'oz',gram:'g',grams:'g',gallon:'gal',gallons:'gal',quart:'qt',quarts:'qt',pint:'pt',pints:'pt',cups:'cup',liter:'l',liters:'l',milliliter:'ml',milliliters:'ml'};
 const packUnit=(match[2].replace(/\s+/g,' ') in aliases)?aliases[match[2].replace(/\s+/g,' ')]:match[2].replace(/\s+/g,' ');
 if(!kind[unit]||kind[unit]!==kind[packUnit])return null;
 // Do not convert cups to fluid ounces for ingredient volume: recipe cups and retail fluid ounces can be different for solids.
 if(kind[unit]==='volume'&&unit==='cup')return null;
 const result=Math.ceil(needed*factors[unit]/(Number(match[1])*factors[packUnit]));
 return Number.isFinite(result)&&result>=1&&result<=30?result:null;
}
