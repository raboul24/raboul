const { APP_URL, OUT } = require('./lib');
const { chromium } = require('playwright'); const fs=require('fs');
const S=OUT;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(APP_URL);
  // seed content
  await p.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('calendar-journal-v1')||'null');
  });
  const configs = {
    default:{}, grid_land:{orient:'landscape',weekly:'grid',notesStyle:'cornell',size:'tablet'},
    planner_daily:{weekly:'planner',daily:'entries',dailyStyle:'schedule',notesStyle:'dotted',useTheme:false},
    none:{weekly:'none',notesStyle:'grid',size:'letter'}, all:{daily:'all',dailyStyle:'checklist',notesStyle:'checklist',orient:'landscape'},
  };
  for (const [name,cfg] of Object.entries(configs)) {
    const res = await p.evaluate(async ([cfg]) => {
      const state = JSON.parse(JSON.stringify({ title:'My Journal – “Test”', year:2026, weekStart:1,
        theme:{paper:'#fffdf7',ink:'#2b2a33',accent:'#c0563b',bar:'#efe6d2',today:'#ffe08a'}, days:{}, notes:{}, tabs:[] }));
      const mk=(name,kind,color,x={})=>({id:name.replace(/\W/g,''),name,kind,color,...x});
      state.tabs=[mk('Index','index','#444'),mk('Year','year','#c0563b',{year:2026,month:0}),...[0,1,2].map(m=>mk(['Jan','Feb','Mar'][m],'month','#5b7fa6',{year:2026,month:m})),mk('Notes','notes','#777'),mk('Goals','notes','#4f9d8a')];
      state.days['2026-01-05']='Kickoff with [[Goals]] and see [[2026-02-14]]. Café – “quotes”. '+ 'long text '.repeat(40);
      state.days['2026-02-14']='Valentine’s day, back to [[Jan]] or [[Nowhere]]';
      state.notes['Notes']='Line one\nSee [[Year]] and [[2026-03-01]]\n'+'word '.repeat(2000);
      state.pdf = cfg;
      const t=performance.now(); const blob = await JournalPDF.generate(state, cfg);
      const buf = new Uint8Array(await blob.arrayBuffer()); let s=''; for(const x of buf) s+=String.fromCharCode(x);
      return { n: JournalPDF.count(state,cfg), size: buf.length, ms: Math.round(performance.now()-t), b64: btoa(s) };
    },[cfg]);
    fs.writeFileSync(`${S}/${name}.pdf`, Buffer.from(res.b64,'base64'));
    console.log(name, res.n,'pages', res.size,'bytes', res.ms+'ms');
  }
  console.log('errors',errs); await b.close();
})();
