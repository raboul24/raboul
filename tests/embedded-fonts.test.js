const { APP_URL, OUT } = require('./lib');
const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({acceptDownloads:true}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(APP_URL);
  const fonts=['caveat','patrickhand','indieflower','specialelite','lora','merriweather','playfair','quicksand','courier'];
  for (const f of fonts) {
    const r = await p.evaluate(async (f) => {
      const raw = JSON.parse(localStorage.getItem('calendar-journal-v1')||'null');
      const state = { title:'Café “Journal” – ok', weekStart:1, theme:{paper:'#fffdf7',ink:'#2b2a33',accent:'#c0563b',today:'#ffe08a',font:'Georgia'}, days:{'2026-01-05':'Kickoff with [[Goals]] café – “quotes” 日本 end'}, notes:{n1:'Hello Wörld [[Year]] '+'lorem ipsum '.repeat(30)},
        tabs:[{id:'i',name:'Index',kind:'index',color:'#444'},{id:'y',name:'Year',kind:'year',color:'#c0563b',year:2026,month:0},{id:'m',name:'Jan',kind:'month',color:'#5b7fa6',year:2026,month:0},{id:'n1',name:'Goals',kind:'notes',color:'#4f9d8a'}]};
      const o={font:f,weekly:'rows',daily:'entries',notesStyle:'lined'};
      await JournalPDF.ready(state,o);
      const blob = await JournalPDF.generate(state,o); const buf=new Uint8Array(await blob.arrayBuffer()); let s=''; for(const x of buf) s+=String.fromCharCode(x);
      return {n:JournalPDF.count(state,o), size:buf.length, b64:btoa(s)};
    }, f);
    fs.writeFileSync(`${OUT}/e_${f}.pdf`, Buffer.from(r.b64,'base64')); console.log(f, r.n, 'pages', r.size,'bytes');
  }
  console.log('errors',errs); await b.close();
})();
