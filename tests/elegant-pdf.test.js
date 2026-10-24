const { APP_URL, OUT } = require('./lib');
const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(APP_URL);
  const cfgs = {e_main:{o:{look:'elegant',weekly:'planner',daily:'entries'}, cover:'frame'}, e_stars:{o:{look:'elegant',weekly:'rows',daily:'none'}, cover:'meadow', theme:{paper:'#5a4a7e',ink:'#f4eefc',accent:'#d9c7a0',today:'#7a68a3'}}};
  for (const [name,c] of Object.entries(cfgs)) {
    const r = await p.evaluate(async ([c]) => {
      const mt=(m)=>({id:'m'+m,name:['Jan','Feb','Mar'][m],kind:'month',color:['#d8c9a8','#cbb894','#b59a6b'][m],year:2026,month:m});
      const state={title:'My 2026 Planner',year:2026,weekStart:1,cover:c.cover,theme:{paper:'#f6f1e7',ink:'#4a4036',accent:'#b59a6b',today:'#e7d6ae',font:'Quicksand',headFont:'',...(c.theme||{})},
        days:{'2026-01-05':'Kickoff with [[Goals]] dinner at 7','2026-01-06':'Dentist 9am'},notes:{n1:'Hello [[Year]] world'},
        tabs:[{id:'i',name:'Index',kind:'index',color:'#8c7a73'},{id:'y',name:'Year',kind:'year',color:'#b59a6b',year:2026,month:0},mt(0),mt(1),mt(2),{id:'n1',name:'Goals',kind:'notes',color:'#9bb89a'},{id:'n2',name:'Notes',kind:'notes',color:'#b9a4c9'}]};
      await JournalPDF.ready(state,c.o); const blob=await JournalPDF.generate(state,c.o); const buf=new Uint8Array(await blob.arrayBuffer()); let s=''; for(const x of buf) s+=String.fromCharCode(x); return {b64:btoa(s),n:JournalPDF.count(state,c.o)};
    },[c]);
    fs.writeFileSync(`${OUT}/${name}.pdf`,Buffer.from(r.b64,'base64')); console.log(name,r.n,'pages');
  }
  console.log('errors',errs); await b.close();
})();
