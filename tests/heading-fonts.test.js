const { APP_URL, OUT } = require('./lib');
const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({acceptDownloads:true}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(APP_URL);
  const cases = { auto_pair:{theme:{font:'Caveat, cursive',headFont:'"Playfair Display", Georgia, serif'},o:{}},
    same:{theme:{font:'Caveat, cursive',headFont:'"Playfair Display", serif'},o:{headFont:'same'}},
    builtin_head:{theme:{font:'Lora, serif',headFont:''},o:{headFont:'helvetica'}},
    builtin_all:{theme:{font:'Verdana',headFont:''},o:{font:'times',headFont:'courier'}},
    emb_only:{theme:{font:'Lora, serif',headFont:''},o:{}} };
  for (const [name,c] of Object.entries(cases)) {
    const r = await p.evaluate(async ([c]) => {
      const state = { title:'Café Journal', weekStart:1, theme:{paper:'#fffdf7',ink:'#2b2a33',accent:'#c0563b',today:'#ffe08a',...c.theme}, days:{'2026-01-05':'Kickoff with [[Goals]] today'}, notes:{n1:'Hello [[Year]]'},
        tabs:[{id:'i',name:'Index',kind:'index',color:'#444'},{id:'y',name:'Year',kind:'year',color:'#c0563b',year:2026,month:0},{id:'m',name:'Jan',kind:'month',color:'#5b7fa6',year:2026,month:0},{id:'n1',name:'Goals',kind:'notes',color:'#4f9d8a'}]};
      const o={weekly:'rows',daily:'entries',...c.o};
      await JournalPDF.ready(state,o); const blob=await JournalPDF.generate(state,o); const buf=new Uint8Array(await blob.arrayBuffer()); let s=''; for(const x of buf) s+=String.fromCharCode(x);
      return {n:JournalPDF.count(state,o),b64:btoa(s)};
    },[c]);
    fs.writeFileSync(`${OUT}/h_${name}.pdf`,Buffer.from(r.b64,'base64')); console.log(name,r.n);
  }
  await p.click('#settingsBtn'); console.log('ui head options:', await p.locator('[data-pdf="headFont"] option').count());
  console.log('errors',errs); await b.close();
})();
