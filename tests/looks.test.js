const { APP_URL, OUT } = require('./lib');
const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(APP_URL);
  for (const [name,o] of Object.entries({soft:{look:'soft',weekly:'rows'},soft_grid:{look:'soft',weekly:'grid',orient:'landscape',notesStyle:'cornell'},soft_planner:{look:'soft',weekly:'planner',daily:'entries',dailyStyle:'schedule'},classic:{look:'classic'}})) {
    const r = await p.evaluate(async (o) => {
      const cols=['#e8a5a5','#f2c6a0','#b9d2a8','#a8cbd6','#c9b6e0','#e6b8cf'];
      const tabs=[{id:'i',name:'Index',kind:'index',color:'#8c7a73'},{id:'y',name:'Year',kind:'year',color:'#d98c8c',year:2026,month:0},...[0,1,2,3,4,5,6,7,8,9,10,11].map(m=>({id:'m'+m,name:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m],kind:'month',color:cols[m%6],year:2026,month:m})),{id:'n1',name:'Goals',kind:'notes',color:'#9bb89a'},{id:'n2',name:'Notes',kind:'notes',color:'#b9a4c9'}];
      const state={title:'My 2026 Life Planner',weekStart:1,theme:{paper:'#fffaf6',ink:'#4a3b3b',accent:'#d98c8c',today:'#fde5c8',font:'Quicksand',headFont:'"Playfair Display", serif'},days:{'2026-01-05':'Kickoff with [[Goals]] dinner at 7'},notes:{n1:'Hello [[Year]]'},tabs};
      await JournalPDF.ready(state,o); const blob=await JournalPDF.generate(state,o); const buf=new Uint8Array(await blob.arrayBuffer()); let s=''; for(const x of buf) s+=String.fromCharCode(x); return btoa(s);
    }, o);
    fs.writeFileSync(`${OUT}/l_${name}.pdf`,Buffer.from(r,'base64'));
  }
  console.log('errors',errs); await b.close();
})();
