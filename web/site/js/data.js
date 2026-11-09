/* Seed data for the Proview Menu preview. In-memory only. */
(function(){
const uid=()=>Math.random().toString(36).slice(2,9);
const SECTIONS=['Breakfast & Brunch','Burgers','Wraps','Menemen','Turkish Style Pan Eggs','Kids Menu','Sides','Salads','Desserts','Fruits & Nuts','Signature Cocktails','Mocktails','Hot Drinks','Smoothies','Iced Drinks','Cocktails','Soft Drinks','Group Shots','Vodka','Whiskey','Gin','Rum','Liquers','Beers','Cognac','Shots','White Wine','Rose Wine','Red Wine','Sparkling & Champagne'];
const ITEMS={
 'Breakfast & Brunch':[['Vegan Breakfast',13.95,0,0,72],['French Toast X Dubai Chocolate',15.95,1,1,91],['Serpme Kahvalti',38.00,1,1,86],['English Twist',15.95,1,1,78],['Veggie Brekky',14.95,1,1,74],['French Toast',13.95,1,1,80],['American Twist',14.95,1,1,77],['Mediterranean Breakfast',15.50,1,1,86],['Avocado Delight',12.95,1,1,83],['Eggs Benedict',12.50,1,1,81],['Eggs Royale',13.50,1,1,79],['Pancake Stack',11.95,1,1,75],['Granola Bowl',8.95,1,1,70],['Shakshuka',12.95,1,1,84],['Halloumi Stack',12.50,1,1,76],['Plain Menemen',9.95,1,1,82]],
 'Burgers':[['S\'Mac Burger',16.95,1,1,88],['Classic Smash',13.95,1,1,80],['Truffle Burger',17.95,1,1,82],['Chicken Burger',14.50,1,1,77]],
 'Wraps':[['Chicken Shawarma Wrap',11.95,1,1,79],['Halloumi Wrap',10.95,1,1,74],['Falafel Wrap',10.50,1,1,73]],
 'Menemen':[['Classic Menemen',10.95,1,1,85],['Sucuk Menemen',12.50,1,1,83]],
 'Turkish Style Pan Eggs':[['Sucuklu Yumurta',11.50,1,1,80],['Kavurmali Yumurta',13.50,1,1,78]],
 'Kids Menu':[['Kids Pancakes',6.95,1,1,70],['Kids Breakfast',7.50,1,1,71]],
 'Sides':[['Fries',4.50,1,1,72],['Sweet Potato Fries',5.50,1,1,74],['Buffalo Chicken Wings',8.95,1,1,81],['Sourdough Toast',2.95,1,1,60]],
 'Salads':[['Goat Cheese Salad',12.95,1,0,68],['Kale Kick',11.50,1,0,66],['Halloumi Salad',12.50,1,1,75]],
 'Desserts':[['Pistachio Kunafa',9.95,1,1,90],['Baklava',7.50,1,1,84],['San Sebastian Cheesecake',8.50,1,1,86]],
 'Fruits & Nuts':[['Fresh Fruit Platter',9.95,1,1,70]],
 'Signature Cocktails':[['Porn Star Martini',11.50,1,1,88],['Pistachio Espresso Martini',12.00,1,1,86]],
 'Mocktails':[['Virgin Mojito',6.95,1,1,74],['Passion Cooler',6.95,1,1,73]],
 'Hot Drinks':[['Flat White',3.60,1,1,81],['Pistachio Latte',4.80,1,1,84],['Turkish Tea',2.50,1,1,69],['Turkish Coffee',3.50,1,1,78],['Cappuccino',3.60,1,1,77]],
 'Smoothies':[['Berry Blast',5.95,1,1,72],['Green Machine',5.95,1,1,70]],
 'Iced Drinks':[['Iced Latte',4.20,1,1,76],['Iced Spanish Latte',4.80,1,1,79]],
 'Cocktails':[['Mojito',10.50,1,1,80],['Aperol Spritz',10.50,1,1,82]],
 'Soft Drinks':[['Coca-Cola',3.20,1,1,70],['Diet Coke',3.20,1,1,68],['Ayran',2.95,1,1,72]],
 'Group Shots':[['Tequila Shots x6',24.00,1,1,65]],
 'Vodka':[['Grey Goose 25ml',5.50,1,1,60]],
 'Whiskey':[['Jameson 25ml',5.00,1,1,60]],
 'Gin':[['Gordons Pink Gin',8.50,1,0,58],['Hendrick\'s & Tonic',10.50,1,1,64]],
 'Rum':[['Bacardi 25ml',5.00,1,1,58]],
 'Liquers':[['Baileys 50ml',5.50,1,1,58],['Raki',6.50,1,0,57]],
 'Beers':[['Efes Draft',5.50,1,1,70],['Peroni',5.50,1,1,68]],
 'Cognac':[['Hennessy VS 25ml',6.50,1,1,58]],
 'Shots':[['Sambuca',4.00,1,1,55]],
 'White Wine':[['Pinot Grigio 175ml',7.50,1,1,62]],
 'Rose Wine':[['Whispering Angel 175ml',9.50,1,1,64]],
 'Red Wine':[['Malbec 175ml',8.50,1,1,63]],
 'Sparkling & Champagne':[['Prosecco 125ml',7.50,1,1,66],['Moët & Chandon Bottle',75.00,1,1,60]],
};
const DESC={'Vegan Breakfast':'Avocado, mushrooms, beans, hash brown, sourdough','French Toast X Dubai Chocolate':'Brioche, pistachio kunafa cream, chocolate','Serpme Kahvalti':'Turkish sharing breakfast for two','English Twist':'Eggs, bacon, sausage, beans, mushrooms, toast','Veggie Brekky':'Halloumi, eggs, avocado, spinach, toast','French Toast':'Brioche, berries, maple, mascarpone','American Twist':'Pancakes, bacon, eggs, maple syrup','Mediterranean Breakfast':'Sucuk, eggs, olives, feta, tomatoes'};
function build(sectionNames,seedOff=0){return sectionNames.map((s,si)=>({id:uid(),name:s,on:true,open:si===0,score:[89,84,80,86,82,78,76,74,88,70][si%10],
  items:(ITEMS[s]||[['House Special',9.95,1,1,70]]).map(([n,p,on,photo,score])=>({id:uid(),name:n,price:p,on:!!on,photo:!!photo,score,desc:DESC[n]||'',discount:'',calories:'',soldOut:false,labels:[],prep:'',carbon:''}))}))}
const menus=[
 {id:'m1',name:'Breakfast & Brunch 08:00 - 16:00',status:'Live',on:true,channels:['dine','pickup','delivery','tablet'],sectionsCount:30,itemsCount:208,updated:'Oct 10, 2026',sections:build(SECTIONS)},
 {id:'m2',name:'Dinner Menu 16:00 - 23:30',status:'Live',on:true,channels:['dine','pickup','delivery','tablet'],sectionsCount:41,itemsCount:320,updated:'Oct 10, 2026',sections:build(SECTIONS.slice(1))},
 {id:'m3',name:'Christmas Set Menu 16:00 - 23:30',status:'Live',on:true,channels:['dine','pickup','delivery','tablet'],sectionsCount:41,itemsCount:320,updated:'Oct 10, 2026',sections:build(SECTIONS.slice(1))},
 {id:'m4',name:'Ramadan Evening Set Menu (£30pp)',status:'Draft',on:false,channels:['dine','pickup','delivery','tablet'],sectionsCount:41,itemsCount:317,updated:'Oct 10, 2026',sections:build(SECTIONS.slice(1))},
];
const FIRST=['Jay','Khateejah','Jipcy','Dorcas','Halil','Baris','Nicole','Sinan','Monir','Firat','Shumel','Sohaib','Ali','Emma','Daniel','Aylin','Mehmet','Priya','Lucy','Tom'];
const LAST=['I.','D.','E.','K.','W.','R.','S.','T.','A.','B.'];
const customers=Array.from({length:24},(_,i)=>({id:'c'+i,name:FIRST[i%FIRST.length]+(i%3?' '+LAST[i%LAST.length]:''),tags:i%5===0?['VIP']:[],email:'guest'+(i+1)+'@example.com',phone:'07700 900'+String(100+i),orders:(i*7)%13+1,last:['a day ago','2 days ago','5 days ago','a week ago','2 weeks ago'][i%5],spend:((i*37)%400)+40,visits:(i*5)%17+1}));
const reviewItems=['Plain Menemen','Serpme Kahvalti','French Toast X Dubai Chocolate','Mediterranean Breakfast','Pistachio Latte','English Twist','Avocado Delight','S\'Mac Burger'];
const reviewTexts=['Absolutely delicious, will order again.','Lovely and fresh, quick service.','Portion could be a bit bigger.','Best Turkish breakfast in London!','Coffee was perfect.','Really tasty, well presented.','A bit salty for me.','Great value for money.'];
const reviews=Array.from({length:20},(_,i)=>({id:'r'+i,text:reviewTexts[i%8],rate:[5,5,4,5,5,4,3,5][i%8],item:reviewItems[i%8]+' (Breakfast & Brunch 08:00 - 16:00)',customer:FIRST[(i+3)%FIRST.length],date:`${String(1+i%28).padStart(2,'0')}/10/2026 ${String(9+i%10).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}`,status:i%9===4?'Waiting':'Live',archived:false}));
const feedbacks=Array.from({length:67},(_,i)=>({id:'Form '+(1011-i),date:`${String(8-(i%8)).padStart(2,'0')}/11/2026 ${String(10+i%11).padStart(2,'0')}:${String((i*13)%60).padStart(2,'0')}`,form:'Sample Form',table:['Table 3','Table 7','Table 12','—'][i%4],unread:i<4,answers:[['Is this your first time at our restaurant?',i%2?'Yes':'No'],['What is your overall satisfaction with our restaurant?','★'.repeat(5-(i%3))],['How would you rate the hygiene?','★'.repeat(5-(i%2))],['How would you rate the taste of our food?','★★★★★'],['Would you come back to eat with us again?','Yes'],['Is there anything else you want to tell us?',['Lovely staff!','Coffee took a while.','—','Great music.'][i%4]],['Name',FIRST[i%FIRST.length]],['Email','guest'+(i+1)+'@example.com']]}));
window.PV_DEMO={
  credits:0,
  venue:{id:'SJ5RJTroD',name:"Alici's",address:'14 Station Road, London',city:'London',country:'United Kingdom of Great Britain and Northern Ireland',zip:'N8 7QB',phone:'020 7946 0321',timezone:'Europe/London',website:'',pincode:'4821'},
  venues:[{name:"Alici's"}],
  menus,
  modifiers:[],
  promotions:[{id:'p1',name:'Valentines Day',desc:'Romantic set for two',sched:'Always',on:false},{id:'p2',name:'Christmas Movie Night',desc:'Festive film night offer',sched:'Always',on:false},{id:'p3',name:'Food Allergy',desc:'Please tell us about any allergies',sched:'Always',on:true},{id:'p4',name:'Au Christmas Bauble',desc:'Christmas bauble cocktail',sched:'Always',on:false}],
  orders:[],archived:[],
  tables:[],areas:['No Area'],staff:[],
  customers,reviews,feedbacks,
  promoCodes:[],
  forms:[{id:'f1',name:'Sample Form',active:true,questions:[['Is this your first time at our restaurant?','Yes/No',true],['What is your overall satisfaction with our restaurant?','Star Rating',true],['How would you rate the hygiene?','Star Rating',false],['How would you rate the taste of our food?','Star Rating',false],['Would you come back to eat with us again?','Yes/No',false],['Is there anything else you want to tell us?','Text Box',false]]}],
  integrations:{payment:['Stripe','Iyzipay','Square','SumUp','STC Pay','Pay2M','Myfatoorah','PayZee','MOKA','NoonPayments'].map(n=>[n,'Payment System','Free']),
    pos:[['Foodics','Free'],['Revel','Free'],['Clover','Free'],['Epos Now','Free'],['POS Rocket','Free'],['Simphony','£29/month'],['Positouch','£29/month'],['Dinerware','£29/month'],['Brink','£29/month'],['Simpra','Free'],['TiPOS','Free']].map(([n,p])=>[n,'Restaurant Management System',p]),
    printer:[['Printer Integration','Receipt Printer','£16/month']],access:[['Binclusive','Accessibility','Free']]},
  connected:[],
  media:[],
};
window.PV_BLANK=function(name){const d=window.PV_DEMO;return {
  credits:0,
  venue:{id:'',name:name||'',address:'',city:'',country:'United Kingdom of Great Britain and Northern Ireland',zip:'',phone:'',timezone:'Europe/London',website:'',pincode:String(1000+Math.floor(Math.random()*9000))},
  venues:[],menus:[],modifiers:[],promotions:[],orders:[],archived:[],tables:[],areas:['No Area'],staff:[],
  customers:[],reviews:[],feedbacks:[],promoCodes:[],
  forms:JSON.parse(JSON.stringify(d.forms)),integrations:d.integrations,connected:[],media:[],
  cfg:{},floor:[],mkConn:{instagram:false,facebook:false,meta:false}}};
window.PV_DATA=window.PV_BLANK('');
})();
