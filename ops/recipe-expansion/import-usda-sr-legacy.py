#!/usr/bin/env python3
"""Generate review-only ingredient candidates from an official USDA SR Legacy CSV archive.
Usage: python3 ops/recipe-expansion/import-usda-sr-legacy.py /path/to/FoodData_Central_sr_legacy_food_csv_2018-04.zip
No API key, third-party library or access to user data required. Does not verify or edit macros.
Download: https://fdc.nal.usda.gov/download-datasets/
"""
import csv, difflib, io, json, pathlib, re, sys, zipfile
BASE=pathlib.Path(__file__).resolve().parent
def norm(x):
    return re.sub(r'[^a-z0-9 ]',' ',x.lower()).strip()
def reader(z, suffix):
    matches=[n for n in z.namelist() if n.lower().endswith('/'+suffix) or n.lower()==suffix]
    if len(matches)!=1: raise ValueError(f'Expected one {suffix}, found {matches}')
    with z.open(matches[0]) as stream:
        yield from csv.DictReader(io.TextIOWrapper(stream,encoding='utf-8-sig',errors='replace',newline=''))
def num(x):
    try:return float(x)
    except (TypeError,ValueError):return None
def main():
    if len(sys.argv)<2: raise SystemExit('Specify downloaded USDA SR Legacy CSV .zip file as argument.')
    staged=json.loads((BASE/'ingredient-nutrition-sources.json').read_text())
    source_path=pathlib.Path(sys.argv[1])
    with zipfile.ZipFile(source_path) as z:
        foods={row['fdc_id']:row for row in reader(z,'food.csv') if row.get('fdc_id') and row.get('description')}
        definitions={row['id']:row.get('name','') for row in reader(z,'nutrient.csv') if row.get('id')}
        # Nutrient values are generally per 100 g edible portion in FoodData Central.
        found={}
        for row in reader(z,'food_nutrient.csv'):
            fdc=row.get('fdc_id')
            if fdc not in foods:continue
            desc=definitions.get(row.get('nutrient_id'),'').lower()
            value=num(row.get('amount'))
            if value is None:continue
            key=None
            if desc=='energy':key='energyCandidate'
            elif desc=='protein':key='proteinPer100g'
            elif desc=='carbohydrate, by difference':key='carbsPer100g'
            elif desc=='total lipid (fat)':key='fatPer100g'
            if key:found.setdefault(fdc,{})[key]=value
        portions={}
        for row in reader(z,'food_portion.csv'):
            fdc=row.get('fdc_id');grams=num(row.get('gram_weight'))
            if fdc in foods and grams and grams>0:
                portions.setdefault(fdc,[]).append({'modifier':row.get('modifier'),'amount':row.get('amount'),'grams':grams})
        labels=list(staged['ingredients'])
        records=[]
        for label in labels:
            key=norm(label)
            # Deliberately conservative, lexical ranking; a human must confirm each food.
            candidates=[]
            for fdc,food in foods.items():
                desc=food['description']
                d=norm(desc)
                terms=set(key.split())
                overlap=len(terms & set(d.split()))/max(1,len(terms))
                if overlap<0.5:continue
                similarity=difflib.SequenceMatcher(None,key,d[:max(len(key)*2,25)]).ratio()
                rank=0.65*overlap+0.35*similarity
                if rank<0.40:continue
                candidates.append((rank,fdc,desc))
            candidates.sort(reverse=True)
            records.append({'ingredient':label,'reviewStatus':'pending','candidates':[
                {'fdcId':fdc,'description':desc,'dataType':'SR Legacy','nutritionCandidatesPer100g':found.get(fdc,{}),'usdaPortionCandidates':portions.get(fdc,[])[:8],'candidateOnly':True}
                for _,fdc,desc in candidates[:5]]})
    output=BASE/'usda-sr-legacy-review-candidates.json'
    output.write_text(json.dumps({'dataset':'USDA SR Legacy April 2018 CSV','originalArchive':source_path.name,'ingredientCount':len(records),'note':'Never auto-approve. Check protein, carbs, fat, energy unit, ingredient state, portion mass and recipe yield; source candidates are NOT verified nutrition.', 'ingredients':records},indent=2)+'\n')
    print('Saved',len(records),'ingredient candidate lists to',output)
    print('NO nutrition figures have been marked verified.')
if __name__=='__main__':main()
