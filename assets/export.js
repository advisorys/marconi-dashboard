/* Marconi Dashboard optional export module.
   Loaded on demand by assets/app.js when the user requests export. */

/* ===== pdf-export-v27-script ===== */
(function(){
  const REPORT_ID = 'printReport';
  function moneyFull(v){ return (typeof fmtMoneyFull === 'function') ? fmtMoneyFull(v) : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(v||0); }
  function moneyShort(v){ return (typeof fmtMoney === 'function') ? fmtMoney(v) : moneyFull(v); }
  function percent(v){ return (typeof fmtPct === 'function') ? fmtPct(v) : `${(Number(v)||0).toFixed(1)}%`; }
  function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function months(){ return (typeof ALL_MONTHS !== 'undefined') ? ALL_MONTHS : [1,2,3,4,5,6,7,8,9,10,11,12]; }
  function mShort(m){ return (typeof MONTH_NAMES_SHORT !== 'undefined' && MONTH_NAMES_SHORT[m]) ? MONTH_NAMES_SHORT[m] : String(m).padStart(2,'0'); }
  function mLong(m){ return (typeof MONTH_NAMES_LONG !== 'undefined' && MONTH_NAMES_LONG[m]) ? MONTH_NAMES_LONG[m] : mShort(m); }
  function isProj(m){ return typeof isProjectionMonth === 'function' ? isProjectionMonth(m) : m > 6; }
  function activePeriod(){ return typeof getActivePeriod === 'function' ? getActivePeriod() : {months:months(), label:'2026 completo', short:'2026', mode:'year'}; }
  function agg(ms){ return typeof aggregate === 'function' ? aggregate(ms) : ms.reduce((a,m)=>{ const d=DATA.monthly[m]; a.entradas+=d.entradas; a.saidas+=d.saidas; a.resultado=a.entradas-a.saidas; a.margem=a.entradas ? a.resultado/a.entradas*100 : 0; return a; },{entradas:0,saidas:0,resultado:0,margem:0,months:ms}); }
  function catBreak(ms){ return typeof getCategoryBreakdown === 'function' ? getCategoryBreakdown(ms) : (DATA.categoryMonthly||DATA.categories||[]).map(c=>({name:c.name,value:ms.reduce((s,m)=>s+(c.months?.[m]||0),0)})).filter(c=>c.value>0).sort((a,b)=>b.value-a.value).map((c,_,arr)=>{ const t=arr.reduce((s,x)=>s+x.value,0); return {...c,pct:t?c.value/t*100:0}; }); }
  function logoSrc(){ const img = document.querySelector('.hero-brand-mark') || document.querySelector('.client-logo img'); return img ? img.getAttribute('src') : ''; }
  function periodTitle(period){ return typeof periodLabelFor === 'function' ? periodLabelFor(period.months, period.mode) : (period.label || '2026'); }
  function footer(n,total){ return `<div class="pdf-footer"><span>Marconi Foods - Fluxo de Caixa 2026</span><span>Página ${n} de ${total}</span></div>`; }
  function header(kicker, n, total){ const logo=logoSrc(); return `<div class="pdf-head"><div class="pdf-brand">${logo?`<img src="${logo}" alt="Marconi Foods">`:''}<div><div class="pdf-brand-name">Marconi Foods</div><div class="pdf-brand-sub">Dashboard financeiro executivo</div></div></div><div><div class="pdf-page-kicker">${esc(kicker)}</div><div class="pdf-page-number">${String(n).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div></div></div>`; }
  function page(kicker, n, total, body){ return `<section class="pdf-page">${header(kicker,n,total)}${body}${footer(n,total)}</section>`; }
  function lineChart(ms){
    const w=980,h=300,pad=38; const vals=ms.map(m=>DATA.monthly[m]); const max=Math.max(...vals.flatMap(d=>[d.entradas,d.saidas,Math.abs(d.resultado)]),1);
    const x=(i)=>pad + (ms.length===1?0:(i*(w-2*pad)/(ms.length-1))); const y=(v)=>h-pad-(v/max)*(h-2*pad);
    const ptsIn=vals.map((d,i)=>`${x(i)},${y(d.entradas)}`).join(' '), ptsOut=vals.map((d,i)=>`${x(i)},${y(d.saidas)}`).join(' '), ptsRes=vals.map((d,i)=>`${x(i)},${y(Math.max(0,d.resultado))}`).join(' ');
    const labels=ms.map((m,i)=>`<text x="${x(i)}" y="${h-8}" text-anchor="middle" fill="#94A0B8" font-size="12" font-weight="800">${mShort(m)}</text>`).join('');
    const grid=[0,.25,.5,.75,1].map(t=>`<line x1="${pad}" y1="${pad+t*(h-2*pad)}" x2="${w-pad}" y2="${pad+t*(h-2*pad)}" stroke="rgba(148,160,184,.16)"/>`).join('');
    return `<svg class="pdf-mini-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${grid}<polyline points="${ptsIn}" fill="none" stroke="#7C7AF5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${ptsOut}" fill="none" stroke="#22D3EE" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${ptsRes}" fill="none" stroke="#34D399" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round" stroke-linejoin="round"/>${labels}</svg>`;
  }
  function waterfall(a){ const max=Math.max(a.entradas,a.saidas,Math.abs(a.resultado),1); const item=(cls,label,val)=>`<div class="pdf-wf-item"><div class="pdf-wf-bar ${cls}" style="height:${Math.max(8,Math.abs(val)/max*60)}mm"></div><div class="pdf-wf-label">${label}</div><div class="pdf-wf-value">${val<0?'-':''}${moneyShort(Math.abs(val))}</div></div>`; return `<div class="pdf-waterfall">${item('in','Entradas',a.entradas)}${item('out','Saídas',a.saidas)}${item(`res ${a.resultado>=0?'pos':'neg'}`,'Resultado',a.resultado)}</div>`; }
  function monthlyTable(ms){ return `<table class="pdf-table"><thead><tr><th>Mês</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Resultado</th><th class="num">Margem</th><th>Status</th></tr></thead><tbody>${ms.map(m=>{ const d=DATA.monthly[m]; const status=isProj(m)?'Projeção':(d.resultado>=0?'Superávit':'Déficit'); const cls=isProj(m)?'proj':(d.resultado>=0?'ok':'bad'); return `<tr><td><b>${mLong(m)}</b></td><td class="num">${moneyFull(d.entradas)}</td><td class="num">${moneyFull(d.saidas)}</td><td class="num" style="color:${d.resultado>=0?'#20D39B':'#F87171'}">${d.resultado>=0?'+':'-'}${moneyFull(Math.abs(d.resultado))}</td><td class="num">${percent(d.entradas ? d.resultado/d.entradas*100 : 0)}</td><td><span class="pdf-status ${cls}">${status}</span></td></tr>`; }).join('')}</tbody></table>`; }
  function categoryBars(cats, limit=10){ const top=cats.slice(0,limit); const max=Math.max(...top.map(c=>c.value),1); return `<div>${top.map((c,i)=>`<div class="pdf-bar-row"><div class="pdf-bar-name">${String(i+1).padStart(2,'0')} · ${esc(c.name)}</div><div class="pdf-bar-track"><div class="pdf-bar-fill" style="width:${Math.max(1,c.value/max*100)}%"></div></div><div class="pdf-bar-val">${moneyShort(c.value)}</div><div class="pdf-bar-pct">${percent(c.pct)}</div></div>`).join('')}</div>`; }
  
  function heatmap(){
    const cats=(DATA.categoryMonthly||DATA.categories).slice(0,10);
    const colors=['#6D6AF4','#22C3D6','#20C997','#E2A331','#E75858','#A66BE8','#D957A0','#83C92E','#35BDB3','#7D8BA8'];
    const allMonths = months();  // FIX v45: variável que faltava
    const totals={}; allMonths.forEach(m=>totals[m]=cats.reduce((s,c)=>s+(c.months?.[m]||0),0));
    const ms = allMonths;
    const avg = ms.reduce((s,m)=>s+(totals[m]||0),0)/Math.max(ms.length,1);
    return `<div class="pdf-month-card-grid">${ms.map(m=>{
      const total=totals[m]||0;
      const result=DATA.monthly[m]?.resultado||0;
      const rows=cats.map((c,i)=>({name:c.name,value:c.months?.[m]||0,color:colors[i]||'#64748B'})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,4);
      const cls=`pdf-month-card ${isProj(m)?'proj':''} ${(result<0 || total>avg*1.35)?'critical':''}`;
      return `<div class="${cls}"><div class="pdf-month-head"><div class="pdf-month-name">${mShort(m)}</div><div class="pdf-month-res" style="color:${result>=0?'#20D39B':'#F87171'}">${result>=0?'+':'-'}${moneyShort(Math.abs(result))}</div></div><div class="pdf-month-total">Saídas: ${total?moneyShort(total):'—'}</div>${rows.map(d=>`<div class="pdf-month-cat"><span class="pdf-month-cat-name">${esc(d.name)}</span><span class="pdf-month-cat-val">${moneyShort(d.value)}</span><span class="pdf-month-track"><i class="pdf-month-fill" style="--w:${total?Math.max(3,d.value/total*100).toFixed(1):0}%;--c:${d.color}"></i></span></div>`).join('')}</div>`;
    }).join('')}</div>`;
  }
function alerts(ms,cats,a){ const realized=ms.filter(m=>!isProj(m)); const base=realized.length?realized:ms; const worst=base.reduce((x,m)=>DATA.monthly[m].resultado<DATA.monthly[x].resultado?m:x,base[0]); const maxOut=ms.reduce((x,m)=>DATA.monthly[m].saidas>DATA.monthly[x].saidas?m:x,ms[0]); const top=cats[0]; const avgOut=ms.reduce((s,m)=>s+DATA.monthly[m].saidas,0)/Math.max(ms.length,1); return [`<div class="pdf-alert" style="--alert:${DATA.monthly[worst].resultado<0?'#F87171':'#20D39B'}"><b>Pior resultado observado</b><span>${mLong(worst)}: ${DATA.monthly[worst].resultado>=0?'+':'-'}${moneyFull(Math.abs(DATA.monthly[worst].resultado))}.</span></div>`,`<div class="pdf-alert" style="--alert:#F59E0B"><b>Maior desembolso mensal</b><span>${mLong(maxOut)} concentrou ${moneyFull(DATA.monthly[maxOut].saidas)} em saídas gerenciais. Média do recorte: ${moneyFull(avgOut)}.</span></div>`,`<div class="pdf-alert" style="--alert:#22D3EE"><b>Categoria dominante</b><span>${top?`${esc(top.name)} representa ${percent(top.pct)} das saídas do período (${moneyFull(top.value)}).`:'Sem categoria dominante no período.'}</span></div>`].join(''); }
  function methodology(){ return `<div class="pdf-method-grid"><div class="pdf-method-card"><h4>Base dos dados</h4><p>Relatório consolidado a partir da planilha Fluxo de Caixa 2026. A visão impressa é um snapshot do período e fluxo ativos no momento da exportação.</p></div><div class="pdf-method-card"><h4>Saídas gerenciais</h4><p>As saídas gerenciais correspondem às saídas brutas deduzidas de ajustes não gerenciais, especialmente Transferência entre Contas e Importação.</p></div><div class="pdf-method-card"><h4>Realizado x projeção</h4><p>Janeiro a junho são meses realizados. Julho a dezembro são projeções e recebem indicação própria nos quadros e tabelas.</p></div><div class="pdf-method-card"><h4>Resultado e margem</h4><p>Resultado = Entradas - Saídas Gerenciais. Margem = Resultado / Entradas, quando há entrada no período.</p></div></div>`; }
  function monthDeltaRows(ms){
    return `<table class="pdf-mini-table"><thead><tr><th>Mês</th><th class="num">Entradas vs mês ant.</th><th class="num">Saídas vs mês ant.</th><th class="num">Resultado vs mês ant.</th><th>Leitura</th></tr></thead><tbody>${ms.map((m,i)=>{ const d=DATA.monthly[m]; if(i===0) return `<tr><td><b>${mShort(m)}</b></td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td>Base comparativa do recorte.</td></tr>`; const p=DATA.monthly[ms[i-1]]; const de=d.entradas-p.entradas, ds=d.saidas-p.saidas, dr=d.resultado-p.resultado; const cls=dr>=0?'#20D39B':'#F87171'; const signal=dr>=0?'melhora':'pressão'; return `<tr><td><b>${mShort(m)}</b></td><td class="num" style="color:${de>=0?'#20D39B':'#F87171'}">${de>=0?'+':'-'}${moneyShort(Math.abs(de))}</td><td class="num" style="color:${ds<=0?'#20D39B':'#F87171'}">${ds>=0?'+':'-'}${moneyShort(Math.abs(ds))}</td><td class="num" style="color:${cls}">${dr>=0?'+':'-'}${moneyShort(Math.abs(dr))}</td><td>${signal==='melhora'?'Ganho de resultado frente ao mês anterior.':'Redução de resultado frente ao mês anterior.'}</td></tr>`; }).join('')}</tbody></table>`;
  }
  function topMonthCards(ms,cats,a){
    const maxIn=ms.reduce((x,m)=>DATA.monthly[m].entradas>DATA.monthly[x].entradas?m:x,ms[0]);
    const maxOut=ms.reduce((x,m)=>DATA.monthly[m].saidas>DATA.monthly[x].saidas?m:x,ms[0]);
    const best=ms.reduce((x,m)=>DATA.monthly[m].resultado>DATA.monthly[x].resultado?m:x,ms[0]);
    const realized=ms.filter(m=>!isProj(m)); const base=realized.length?realized:ms;
    const worst=base.reduce((x,m)=>DATA.monthly[m].resultado<DATA.monthly[x].resultado?m:x,base[0]);
    const top=cats[0];
    return `<div class="pdf-kpi-strip"><div class="pdf-kpi-tiny"><div class="lbl">Maior entrada</div><div class="val gold">${mShort(maxIn)}</div><div class="pdf-note">${moneyShort(DATA.monthly[maxIn].entradas)}</div></div><div class="pdf-kpi-tiny"><div class="lbl">Maior saída</div><div class="val">${mShort(maxOut)}</div><div class="pdf-note">${moneyShort(DATA.monthly[maxOut].saidas)}</div></div><div class="pdf-kpi-tiny"><div class="lbl">Melhor resultado</div><div class="val green">${mShort(best)}</div><div class="pdf-note">${moneyShort(DATA.monthly[best].resultado)}</div></div><div class="pdf-kpi-tiny"><div class="lbl">Pior realizado</div><div class="val ${DATA.monthly[worst].resultado<0?'red':'green'}">${mShort(worst)}</div><div class="pdf-note">${DATA.monthly[worst].resultado>=0?'+':'-'}${moneyShort(Math.abs(DATA.monthly[worst].resultado))}</div></div><div class="pdf-kpi-tiny"><div class="lbl">Categoria top</div><div class="val gold">${top?percent(top.pct):'—'}</div><div class="pdf-note">${top?esc(top.name):'Sem base'}</div></div></div>`;
  }
  function periodNarrative(ms,cats,a){
    const pos=a.resultado>=0; const top=cats[0]; const top3=cats.slice(0,3).reduce((s,c)=>s+c.pct,0); const realized=ms.filter(m=>!isProj(m)); const proj=ms.filter(isProj);
    return `<div class="pdf-sentence-card"><h4>Leitura gerencial</h4><p>O recorte analisado apresenta <b style="color:${pos?'#20D39B':'#F87171'}">resultado ${pos?'positivo':'negativo'}</b> de <b>${pos?'+':'-'}${moneyFull(Math.abs(a.resultado))}</b>, com margem de <b>${percent(a.margem)}</b>. ${top?`A principal concentração está em <b>${esc(top.name)}</b>, que representa <b>${percent(top.pct)}</b> das saídas classificadas.`:''} ${top3?`As três maiores categorias concentram <b>${percent(top3)}</b> do desembolso, indicando ${top3>70?'alta':'moderada'} dependência de poucos grupos de pagamento.`:''} ${proj.length&&realized.length?'O recorte combina meses realizados e projetados; projeções devem ser lidas como premissas de acompanhamento.':''}</p></div>`;
  }
  function categoryConcentrationPage(cats,ms){
    const top=cats.slice(0,6); const total=cats.reduce((s,c)=>s+c.value,0)||1;
    const cards=top.map(c=>{ const vals=ms.map(m=>({m,v:c.months?.[m]||0})); const peak=vals.reduce((a,b)=>b.v>a.v?b:a, vals[0]||{m:ms[0],v:0}); const active=vals.filter(x=>x.v>0).length; return `<div class="pdf-sentence-card"><h4>${esc(c.name)}</h4><p><b>${moneyFull(c.value)}</b> no período (${percent(c.value/total*100)} do total). Pico em <b>${mLong(peak.m)}</b> com <b>${moneyFull(peak.v)}</b>. Presença em <b>${active}</b> mês(es) do recorte.</p></div>`; }).join('');
    return `<div class="pdf-subgrid-3">${cards}</div>`;
  }
  function riskMap(cats,ms){
    const total=cats.reduce((s,c)=>s+c.value,0)||1;
    const groups={hh:[],hl:[],lh:[],ll:[]};
    cats.forEach(c=>{ const active=ms.filter(m=>(c.months?.[m]||0)>0).length; const impact=c.value/total; const rec=active/Math.max(ms.length,1); const key=(impact>=.05?'h':'l')+(rec>=.45?'h':'l'); (groups[key]||groups.ll).push(c); });
    const block=(key,title,desc)=>`<div class="pdf-risk-card"><h4>${title}</h4><p>${desc}</p>${groups[key].slice(0,8).map(c=>`<span class="pdf-chip"><strong>${percent(c.pct)}</strong>${esc(c.name)}</span>`).join('') || '<span class="pdf-chip">Sem itens relevantes</span>'}</div>`;
    return `<div class="pdf-risk-grid">${block('hh','Impacto alto · Recorrência alta','Categorias com peso material e presença em muitos meses; exigem acompanhamento recorrente.')}${block('hl','Impacto alto · Pontual','Categorias relevantes concentradas em poucos meses; bom foco para explicar picos de caixa.')}${block('lh','Impacto menor · Recorrente','Gastos de menor peso, mas com recorrência operacional.')}${block('ll','Baixo impacto · Baixa recorrência','Itens residuais ou pouco frequentes no recorte.')}</div>`;
  }
  function timeline(ms){
    const all=months();
    return `<div class="pdf-timeline">${all.map(m=>{ const d=DATA.monthly[m]; const bad=d.resultado<0; const text=bad?`Déficit de ${moneyShort(Math.abs(d.resultado))}`:`Superávit de ${moneyShort(d.resultado)}`; const extra=isProj(m)?'Projeção':'Realizado'; return `<div class="pdf-time-item ${bad?'bad':''}"><div class="m">${mShort(m)}</div><div class="v">${text}</div><div class="pdf-note" style="font-size:5.6pt;margin-top:1.5mm">${extra}</div></div>`; }).join('')}</div>`;
  }
  function outlierAnalysis(ms,cats){
    const outs=ms.map(m=>DATA.monthly[m].saidas); const avg=outs.reduce((s,v)=>s+v,0)/Math.max(outs.length,1); const maxOut=ms.reduce((x,m)=>DATA.monthly[m].saidas>DATA.monthly[x].saidas?m:x,ms[0]);
    const top=cats[0]; const top3=cats.slice(0,3).reduce((s,c)=>s+c.pct,0);
    return `<div class="pdf-subgrid-3"><div class="pdf-sentence-card"><h4>Outlier de saída</h4><p><b>${mLong(maxOut)}</b> registra o maior desembolso: <b>${moneyFull(DATA.monthly[maxOut].saidas)}</b>. Média do recorte: <b>${moneyFull(avg)}</b>.</p></div><div class="pdf-sentence-card"><h4>Concentração</h4><p>Top 3 categorias concentram <b>${percent(top3)}</b> das saídas. ${top3>70?'Nível elevado de concentração, adequado para discussão em reunião.':'Concentração moderada.'}</p></div><div class="pdf-sentence-card"><h4>Rubrica dominante</h4><p>${top?`<b>${esc(top.name)}</b> é a maior rubrica, com <b>${moneyFull(top.value)}</b> e participação de <b>${percent(top.pct)}</b>.`:'Sem rubrica dominante.'}</p></div></div>`;
  }
  function meetingAgenda(ms,cats,a){
    const maxOut=ms.reduce((x,m)=>DATA.monthly[m].saidas>DATA.monthly[x].saidas?m:x,ms[0]); const worst=ms.reduce((x,m)=>DATA.monthly[m].resultado<DATA.monthly[x].resultado?m:x,ms[0]); const top=cats[0];
    const items=[`Validar causas do maior desembolso em ${mLong(maxOut)} (${moneyFull(DATA.monthly[maxOut].saidas)}).`, top?`Discutir plano de acompanhamento para ${top.name}, principal categoria do período.`:'Validar composição das principais categorias.', `Revisar premissas dos meses projetados e impactos sobre o caixa.`, `Monitorar ${mLong(worst)} como ponto de atenção de resultado.`, `Definir responsáveis por ações sobre rubricas concentradas e recorrentes.`];
    return `<table class="pdf-mini-table"><thead><tr><th>#</th><th>Ponto para reunião</th><th>Objetivo</th></tr></thead><tbody>${items.map((x,i)=>`<tr><td><b>${String(i+1).padStart(2,'0')}</b></td><td>${esc(x)}</td><td>${i<2?'Explicação e plano de ação':i===2?'Validação de premissas':'Acompanhamento gerencial'}</td></tr>`).join('')}</tbody></table>`;
  }
  function buildPrintReport(){
    if (typeof DATA === 'undefined') return;
    const old=document.getElementById(REPORT_ID); if(old) old.remove();
    const period=activePeriod(); const ms=period.months || months(); const a=agg(ms); const cats=catBreak(ms); const totalPages=10; const top=cats[0]; const pos=a.resultado>=0;
    const report=document.createElement('div'); report.id=REPORT_ID;
    report.innerHTML = [
      page('Capa executiva',1,totalPages,`<div class="pdf-content-fill"><div style="height:8mm"></div><div class="pdf-badge">${esc(periodTitle(period))}</div><h1 class="pdf-title" style="font-size:38pt;margin-top:9mm;max-width:160mm">Performance Financeira 2026</h1><p class="pdf-subtitle">Relatório executivo de fluxo de caixa com recorte de <b>${esc(periodTitle(period))}</b>. Documento preparado para leitura em PDF, com páginas fixas e sem quebra interna de gráficos, tabelas ou cards.</p><div class="pdf-grid-3" style="margin-top:7mm"><div class="pdf-card"><div class="pdf-label">Entradas</div><div class="pdf-value gold">${moneyFull(a.entradas)}</div></div><div class="pdf-card"><div class="pdf-label">Saídas gerenciais</div><div class="pdf-value">${moneyFull(a.saidas)}</div></div><div class="pdf-card"><div class="pdf-label">Resultado</div><div class="pdf-value ${pos?'green':'red'}">${pos?'+':'-'}${moneyFull(Math.abs(a.resultado))}</div></div></div>${periodNarrative(ms,cats,a)}</div>`),
      page('Síntese financeira',2,totalPages,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Síntese do período</h2>${topMonthCards(ms,cats,a)}<div class="pdf-grid-2"><div class="pdf-card">${waterfall(a)}<div class="pdf-note">Leitura ponte: entradas menos saídas gerenciais formam o resultado do período.</div></div><div class="pdf-card"><div class="pdf-label">Indicadores centrais</div><div class="pdf-grid-2" style="gap:3mm"><div class="pdf-card compact"><div class="pdf-label">Meses exibidos</div><div class="pdf-value">${ms.length}</div></div><div class="pdf-card compact"><div class="pdf-label">Margem</div><div class="pdf-value ${pos?'green':'red'}">${percent(a.margem)}</div></div><div class="pdf-card compact"><div class="pdf-label">Top categoria</div><div class="pdf-value" style="font-size:12pt;line-height:1.1">${top?esc(top.name):'—'}</div></div><div class="pdf-card compact"><div class="pdf-label">Participação top</div><div class="pdf-value gold">${top?percent(top.pct):'—'}</div></div></div></div></div>${timeline(ms)}</div>`),
      page('Movimentação mensal',3,totalPages,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Movimentação consolidada por mês</h2><div class="pdf-card"><div class="pdf-label">Entradas, saídas e resultado positivo</div>${lineChart(ms)}<div class="pdf-note">Linhas: entradas em roxo, saídas gerenciais em ciano e resultado positivo em verde tracejado.</div></div>${outlierAnalysis(ms,cats)}</div>`),
      page('Composição de saídas',4,totalPages,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Ranking de categorias</h2><div class="pdf-card">${categoryBars(cats,10)}</div><div class="pdf-grid-3"><div class="pdf-card compact"><div class="pdf-label">Total classificado</div><div class="pdf-value">${moneyFull(cats.reduce((s,c)=>s+c.value,0))}</div></div><div class="pdf-card compact"><div class="pdf-label">Top 3</div><div class="pdf-value gold">${percent(cats.slice(0,3).reduce((s,c)=>s+c.pct,0))}</div></div><div class="pdf-card compact"><div class="pdf-label">Categorias</div><div class="pdf-value">${cats.length}</div></div></div></div>`),
      page('Composição mensal',5,totalPages,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Composição mensal por categoria</h2><div class="pdf-card"><div class="pdf-label">Barras empilhadas por mês e rubrica</div>${heatmap()}</div><div class="pdf-callout"><b>Como ler:</b> cada coluna representa um mês e os segmentos demonstram a composição das saídas por rubrica. Meses mais altos indicam maior desembolso total.</div>${categoryConcentrationPage(cats,ms)}</div>`),
      page('Tabela mensal',6,totalPages,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Detalhamento mensal</h2><div class="pdf-card">${monthlyTable(months())}</div></div>`),
      page('Variação mensal',7,totalPages,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Evolução mês contra mês</h2><div class="pdf-card">${monthDeltaRows(ms)}</div><div class="pdf-callout"><b>Objetivo:</b> evidenciar se a variação de caixa veio por aumento/redução de entradas, aumento/redução de saídas ou mudança combinada entre os dois fatores.</div></div>`),
      page('Risco por categoria',8,totalPages,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Mapa de risco gerencial</h2>${riskMap(cats,ms)}<div class="pdf-callout"><b>Critério:</b> impacto considera participação no total de saídas; recorrência considera quantidade de meses com valor na categoria dentro do período selecionado.</div></div>`),
      page('Insights para reunião',9,totalPages,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Pauta executiva sugerida</h2><div class="pdf-grid-2"><div class="pdf-card"><div class="pdf-label">Pontos recomendados</div>${meetingAgenda(ms,cats,a)}</div><div class="pdf-card"><div class="pdf-label">Resumo para discussão</div><p class="pdf-note">O relatório indica ${pos?'geração':'consumo'} líquido de caixa de <b>${pos?'+':'-'}${moneyFull(Math.abs(a.resultado))}</b>. A análise deve priorizar concentração de desembolsos, comportamento dos meses projetados e explicação dos meses de maior pressão financeira.</p><div style="height:4mm"></div>${alerts(ms,cats,a)}</div></div></div>`),
      page('Alertas e metodologia',10,totalPages,`<div class="pdf-content-fill"><div class="pdf-print-notes"><div><h2 class="pdf-section-title">Pontos de atenção</h2>${alerts(ms,cats,a)}<div class="pdf-callout"><b>Recomendação:</b> utilizar os alertas como agenda de validação, não como conclusão isolada. A priorização deve considerar valor, recorrência e capacidade de ação gerencial.</div></div><div><h2 class="pdf-section-title">Metodologia</h2>${methodology()}</div></div></div>`)
    ].join('');
    document.body.appendChild(report);
  }
  /* ============================================================
     PACOTE DO CONSELHO (E2 · Onda 5) — PDF executivo consolidado
     Constrói UM relatório paginado A4 na ordem:
       1. Capa Diretoria (veredito + selo + caixa gerado RJ)
       2. Fluxo de Caixa
       3. Custos Fixos
       4. DRE assinada (Priori)
       5. Recuperação Judicial
       6. Metodologia (caixa Bling × competência Priori)
     Reaproveita a infra de paginação existente (page/header/footer,
     pdf-page, A4 landscape). Tudo DERIVADO de window.DASHBOARD_DATA —
     nenhum número inventado. É lazy (só carrega com export.js).
     ============================================================ */
  function fullData(){ return window.DASHBOARD_DATA || window.__DATA__ || {}; }
  function realizedMonthsList(){ return months().filter(m=>!isProj(m)); }

  // RJ — rubricas do processo (espelha 47-rj.js, batidas 1:1 contra os dados).
  const COUNCIL_RJ_RUBRICS = [
    'Honorários advocatícios-AJ', 'Honorários consultoria', 'Reembolso consultoria',
    'Honorários advocatícios', 'Honorários contábeis'
  ];
  function councilRjCost(){
    const cf = fullData().custos_fixos;
    const out = { rubrics: [], rjTotal: 0, fixedTotal: 0, opTotal: 0, pct: 0 };
    if (!cf || !Array.isArray(cf.items)) return out;
    const byName = {};
    cf.items.forEach(it=>{ const real=(it.months||[]).reduce((s,m)=>s+(Number(m&&m[1])||0),0); out.fixedTotal+=real; byName[it.name]=(byName[it.name]||0)+real; });
    COUNCIL_RJ_RUBRICS.forEach(name=>{ const v=byName[name]||0; if(v>0||byName.hasOwnProperty(name)){ out.rubrics.push({name,value:v}); out.rjTotal+=v; } });
    out.opTotal = out.fixedTotal - out.rjTotal;
    out.pct = out.fixedTotal>0 ? out.rjTotal/out.fixedTotal*100 : 0;
    return out;
  }
  function councilOpCash(){
    const out = { accum: 0, series: [] };
    const mov = {};
    (DATA.categoryMonthly||[]).forEach(c=>{ if(c && /Mov\.\s*Financeiras/i.test(c.name||'')){ const mm=c.months||{}; for(let m=1;m<=12;m++) mov[m]=Number(mm[m]!=null?mm[m]:mm[String(m)])||0; } });
    realizedMonthsList().forEach(m=>{ const rec=DATA.monthly[m]; if(!rec) return; const opGen=(Number(rec.resultado)||0)+(mov[m]||0); out.series.push({m,opGen}); out.accum+=opGen; });
    return out;
  }
  // DRE — leitura das linhas assinadas (acum autoritativo).
  function dreLine(key){ const dre=fullData().dre; if(!dre||!Array.isArray(dre.lines)) return null; return dre.lines.find(l=>l.key===key)||null; }
  function dreAcum(key){ const l=dreLine(key); return l && typeof l.acum==='number' ? l.acum : 0; }

  function councilDirectorVerdict(opAccum, lucro){
    // Veredito derivado do número-chave de caixa + lucro assinado.
    if (opAccum < 0) return { word: 'QUEIMA DE CAIXA', tone: 'red' };
    if (lucro < 0) return { word: 'PREJUÍZO CONTÁBIL', tone: 'red' };
    if (opAccum < 300000) return { word: 'GERAÇÃO MAGRA', tone: 'gold' };
    return { word: 'CAIXA POSITIVO', tone: 'green' };
  }

  function councilFixedTable(){
    const cf = fullData().custos_fixos; if(!cf||!Array.isArray(cf.totals)) return '';
    const realized = realizedMonthsList();
    const rows = cf.totals.map(t=>{
      let est=0, real=0; realized.forEach(m=>{ const r=t.months[m-1]||[0,0,0,0]; est+=r[0]||0; real+=r[1]||0; });
      const diff = real-est; const pct = est? diff/est*100 : 0;
      return `<tr><td><b>${esc(t.name)}</b></td><td class="num">${moneyFull(est)}</td><td class="num">${moneyFull(real)}</td><td class="num" style="color:${diff<=0?'#20D39B':'#F87171'}">${diff>=0?'+':'-'}${moneyFull(Math.abs(diff))}</td><td class="num">${percent(pct)}</td></tr>`;
    }).join('');
    let estT=0, realT=0; cf.totals.forEach(t=>{ realized.forEach(m=>{ const r=t.months[m-1]||[0,0,0,0]; estT+=r[0]||0; realT+=r[1]||0; }); });
    const diffT = realT-estT;
    return `<table class="pdf-table"><thead><tr><th>Grupo</th><th class="num">Orçado (realizado)</th><th class="num">Realizado</th><th class="num">Desvio</th><th class="num">%</th></tr></thead><tbody>${rows}<tr style="font-weight:800"><td>TOTAL</td><td class="num">${moneyFull(estT)}</td><td class="num">${moneyFull(realT)}</td><td class="num" style="color:${diffT<=0?'#20D39B':'#F87171'}">${diffT>=0?'+':'-'}${moneyFull(Math.abs(diffT))}</td><td class="num">${percent(estT?diffT/estT*100:0)}</td></tr></tbody></table>`;
  }

  function councilDreTable(){
    const dre = fullData().dre; if(!dre||!Array.isArray(dre.lines)) return '';
    const labels = { receita_bruta:'Receita Bruta', rec_fin:'Receitas Financeiras', deducoes:'(–) Deduções', receita_liquida:'Receita Líquida', cmv:'(–) CMV / CPV', lucro_bruto:'Lucro Bruto', desp_vendas:'(–) Despesas com Vendas', desp_adm:'(–) Despesas Administrativas', desp_gerais:'(–) Despesas Gerais', desp_fin:'(–) Despesas Financeiras', descontos:'(–) Descontos Concedidos', resultado:'Resultado Líquido' };
    const rl = dreAcum('receita_liquida') || 1;
    const order = ['receita_bruta','deducoes','receita_liquida','cmv','lucro_bruto','desp_vendas','desp_adm','desp_gerais','desp_fin','resultado'];
    const rows = order.map(k=>{ const l=dreLine(k); if(!l) return ''; const v=typeof l.acum==='number'?l.acum:0; const av=rl?v/rl*100:0; const strong=(k==='receita_liquida'||k==='lucro_bruto'||k==='resultado'); return `<tr${strong?' style="font-weight:800;background:rgba(148,160,184,.06)"':''}><td>${esc(labels[k]||k)}</td><td class="num" style="color:${v>=0?'#E8ECF4':'#F87171'}">${v>=0?'':'-'}${moneyFull(Math.abs(v))}</td><td class="num">${percent(av)}</td></tr>`; }).join('');
    return `<table class="pdf-table"><thead><tr><th>Linha (acumulado assinado)</th><th class="num">Valor</th><th class="num">AV% (s/ RL)</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function councilRjCostTable(rj){
    const rows = rj.rubrics.map(r=>`<tr><td>${esc(r.name)}</td><td class="num">${moneyFull(r.value)}</td><td class="num">${percent(rj.fixedTotal?r.value/rj.fixedTotal*100:0)}</td></tr>`).join('');
    return `<table class="pdf-table"><thead><tr><th>Rubrica do processo de RJ</th><th class="num">Realizado</th><th class="num">% do custo fixo</th></tr></thead><tbody>${rows}<tr style="font-weight:800"><td>TOTAL CUSTO DA RJ</td><td class="num">${moneyFull(rj.rjTotal)}</td><td class="num gold">${percent(rj.pct)}</td></tr><tr><td>Estrutura operacional pura (resto)</td><td class="num">${moneyFull(rj.opTotal)}</td><td class="num">${percent(100-rj.pct)}</td></tr></tbody></table>`;
  }

  function councilMethodology(){
    return `<div class="pdf-method-grid"><div class="pdf-method-card"><h4>Duas bases distintas</h4><p>O Fluxo de Caixa segue o <b>regime de caixa</b> (extrato Bling). A DRE segue o <b>regime de competência</b> (contabilidade Priori, demonstrações assinadas Jan–Abr). Por isso o caixa girado e o lucro contábil <b>não coincidem</b> e não devem ser somados.</p></div><div class="pdf-method-card"><h4>Fluxo (caixa Bling)</h4><p>Saídas por Grupo DRE; Importação conta como saída real; exclui-se apenas a Classe AJUSTE (transferências). Só realizado — meses futuros = 0.</p></div><div class="pdf-method-card"><h4>DRE (competência Priori)</h4><p>Linhas e totais usam o <b>acumulado assinado</b> (autoritativo). A soma dos meses pode divergir do acumulado por reclassificações contábeis.</p></div><div class="pdf-method-card"><h4>Camada de RJ</h4><p>Custo da RJ e geração de caixa operacional são <b>derivados em runtime</b> dos dados já publicados. Estimativas <b>gerenciais</b> — não constituem plano homologado.</p></div></div>`;
  }

  function buildCouncilReport(){
    const data = fullData();
    if (typeof DATA === 'undefined' || !DATA.monthly) return;
    const old=document.getElementById('councilReport'); if(old) old.remove();
    const realized = realizedMonthsList();
    const aReal = agg(realized.length?realized:months());
    const rj = councilRjCost();
    const op = councilOpCash();
    const lucro = dreAcum('resultado');
    const rob = dreAcum('receita_bruta');
    const cmv = dreAcum('cmv');
    const rl = dreAcum('receita_liquida');
    const verdict = councilDirectorVerdict(op.accum, lucro);
    const realizedLabel = realized.length ? `${mLong(realized[0])}–${mLong(realized[realized.length-1])}/2026` : '2026';
    const T = 6;
    const report=document.createElement('div'); report.id='councilReport';
    report.innerHTML = [
      // 1 · Capa Diretoria
      page('Pacote do Conselho · Capa',1,T,`<div class="pdf-content-fill"><div style="height:6mm"></div><div class="pdf-badge">EM RECUPERAÇÃO JUDICIAL · ${esc(realizedLabel)}</div><h1 class="pdf-title" style="font-size:34pt;margin-top:7mm;max-width:170mm">Pacote do Conselho<br>Performance Financeira 2026</h1><p class="pdf-subtitle">Documento executivo consolidado para conselho, administrador judicial e assembleias de credores. Consolida fluxo de caixa, custos fixos, DRE assinada e a camada de Recuperação Judicial em um único relatório paginado.</p><div class="pdf-card" style="margin-top:6mm;border-left:3px solid var(--accent, #34D399)"><div class="pdf-label">Veredito do período</div><div class="pdf-value ${verdict.tone}">${esc(verdict.word)}</div><div class="pdf-note">Caixa operacional gerado (acum. realizado, exclui antecipações/empréstimos): <b style="color:${op.accum>=0?'#20D39B':'#F87171'}">${op.accum>=0?'+':'-'}${moneyFull(Math.abs(op.accum))}</b>. Resultado contábil assinado (acum.): <b style="color:${lucro>=0?'#20D39B':'#F87171'}">${lucro>=0?'+':'-'}${moneyFull(Math.abs(lucro))}</b>.</div></div><div class="pdf-grid-3" style="margin-top:6mm"><div class="pdf-card"><div class="pdf-label">Entradas (caixa realizado)</div><div class="pdf-value gold">${moneyFull(aReal.entradas)}</div></div><div class="pdf-card"><div class="pdf-label">Saídas gerenciais</div><div class="pdf-value">${moneyFull(aReal.saidas)}</div></div><div class="pdf-card"><div class="pdf-label">Custo da RJ</div><div class="pdf-value red">${moneyFull(rj.rjTotal)}</div></div></div></div>`),
      // 2 · Fluxo de Caixa
      page('Fluxo de Caixa',2,T,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Fluxo de Caixa (regime de caixa · Bling)</h2><div class="pdf-card"><div class="pdf-label">Entradas, saídas e resultado por mês</div>${lineChart(realized.length?realized:months())}<div class="pdf-note">Linhas: entradas em roxo, saídas gerenciais em ciano, resultado positivo em verde tracejado. Recorte: meses realizados.</div></div><div class="pdf-card" style="margin-top:5mm"><div class="pdf-label">Detalhamento mensal</div>${monthlyTable(months())}</div></div>`),
      // 3 · Custos Fixos
      page('Custos Fixos',3,T,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Custos Fixos — orçado × realizado</h2><div class="pdf-card">${councilFixedTable()}<div class="pdf-note">Orçado e realizado somados sobre os meses realizados (${esc(realizedLabel)}); desvio negativo = abaixo do orçado.</div></div></div>`),
      // 4 · DRE assinada
      page('DRE assinada',4,T,`<div class="pdf-content-fill"><h2 class="pdf-section-title">DRE contábil assinada (Priori · competência)</h2><div class="pdf-card">${councilDreTable()}<div class="pdf-note">Valores em <b>acumulado assinado</b> (autoritativo). AV% = participação na Receita Líquida. ROB ${moneyShort(rob)} · CMV ${moneyShort(Math.abs(cmv))} (${percent(rl?Math.abs(cmv)/rl*100:0)} da RL) · Resultado ${lucro>=0?'+':'-'}${moneyShort(Math.abs(lucro))}.</div></div></div>`),
      // 5 · Recuperação Judicial
      page('Recuperação Judicial',5,T,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Camada de Recuperação Judicial</h2><div class="pdf-card">${councilRjCostTable(rj)}<div class="pdf-note">O custo do processo de RJ representa <b class="gold">${percent(rj.pct)}</b> de todo o custo fixo realizado; a estrutura operacional pura é o restante. Honorários AJ, consultoria e advocatícios isolados das demais despesas.</div></div><div class="pdf-callout" style="margin-top:5mm"><b>Caixa operacional gerado</b> (acum. realizado, excluindo antecipações/empréstimos): <b style="color:${op.accum>=0?'#20D39B':'#F87171'}">${op.accum>=0?'+':'-'}${moneyFull(Math.abs(op.accum))}</b>. Runway depende do saldo de caixa (a expor pelo importador) — estimativa gerencial, não plano homologado.</div></div>`),
      // 6 · Metodologia
      page('Metodologia',6,T,`<div class="pdf-content-fill"><h2 class="pdf-section-title">Metodologia — caixa Bling × competência Priori</h2>${councilMethodology()}<div class="pdf-callout" style="margin-top:5mm"><b>Leitura conjunta:</b> o caixa girou na ordem de dezenas de milhões enquanto o resultado contábil foi marginal — as duas bases respondem a perguntas diferentes (liquidez vs. resultado econômico) e por isso convivem neste pacote sem serem somadas.</div></div>`)
    ].join('');
    document.body.appendChild(report);
  }
  function councilToast(){ let t=document.getElementById('pdfExportToast'); if(!t){ t=document.createElement('div'); t.id='pdfExportToast'; t.className='pdf-export-toast'; document.body.appendChild(t); } t.textContent='Preparando Pacote do Conselho (PDF)'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1600); }
  function runCouncilExport(e){
    if(e){ e.preventDefault(); e.stopPropagation(); if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation(); }
    // Garante o modo "pacote do conselho": esconde o relatório de fluxo padrão para não duplicar páginas.
    const std=document.getElementById(REPORT_ID); if(std) std.remove();
    councilToast();
    buildCouncilReport();
    document.body.classList.add('council-export-active');
    const cleanup=()=>{ document.body.classList.remove('council-export-active'); window.removeEventListener('afterprint',cleanup); };
    window.addEventListener('afterprint',cleanup);
    setTimeout(()=>window.print(),200);
  }
  window.buildCouncilReportV1 = buildCouncilReport;
  window.runCouncilExport = runCouncilExport;

  function toast(){ let t=document.getElementById('pdfExportToast'); if(!t){ t=document.createElement('div'); t.id='pdfExportToast'; t.className='pdf-export-toast'; document.body.appendChild(t); } t.textContent='Preparando relatório PDF paginado'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400); }
  function runPrint(e){ if(e){ e.preventDefault(); e.stopImmediatePropagation(); } toast(); buildPrintReport(); setTimeout(()=>window.print(),180); }
  window.buildPrintReportV27 = buildPrintReport;
  window.addEventListener('beforeprint', buildPrintReport);
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(buildPrintReport,650);
    const btn=document.getElementById('printDashboard');
    if(btn){ btn.addEventListener('click',runPrint,true); btn.addEventListener('keydown',ev=>{ if(ev.key==='Enter'||ev.key===' '){ runPrint(ev); }},true); }
  });
})();

/* ===== patch-v57-pptx-export ===== */
/* PATCH v57 - Export PowerPoint refinado */
(function() {
  'use strict';
  
  let html2canvasLoaded = false;
  let pptxLoaded = false;
  
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  
  async function loadDependencies(updateStatus) {
    if (!html2canvasLoaded) {
      updateStatus('Carregando biblioteca de captura...', 5);
      await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      html2canvasLoaded = true;
    }
    if (!pptxLoaded) {
      updateStatus('Carregando gerador de slides...', 10);
      await loadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js');
      pptxLoaded = true;
    }
  }
  
  function createOverlay() {
    let overlay = document.getElementById('exportOverlayV57');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'exportOverlayV57';
    overlay.className = 'export-overlay';
    overlay.innerHTML = `
      <div class="export-spinner"></div>
      <div class="export-title">Gerando Apresentação</div>
      <div class="export-status" id="exportStatusV57">Iniciando...</div>
      <div class="export-progress">
        <div class="export-progress-bar" id="exportProgressV57"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }
  
  function updateStatus(msg, progress) {
    const el = document.getElementById('exportStatusV57');
    const bar = document.getElementById('exportProgressV57');
    if (el) el.textContent = msg;
    if (bar && typeof progress === 'number') bar.style.width = progress + '%';
  }
  
  function showOverlay() { createOverlay().classList.add('show'); }
  function hideOverlay() {
    const o = document.getElementById('exportOverlayV57');
    if (o) o.classList.remove('show');
  }
  
  async function waitFor(ms) { return new Promise(r => setTimeout(r, ms)); }
  
  async function captureElement(selector, options = {}) {
    const el = document.querySelector(selector);
    if (!el) {
      console.warn('[Export] Elemento não encontrado:', selector);
      return null;
    }
    
    // Scroll até o elemento e aguarda render
    el.scrollIntoView({ behavior: 'instant', block: 'start' });
    window.scrollTo(0, Math.max(0, el.offsetTop - 80));
    
    // Dispara resize pra charts recalcularem
    window.dispatchEvent(new Event('resize'));
    
    // Aguarda render
    await waitFor(700);
    
    try {
      const rect = el.getBoundingClientRect();
      
      const canvas = await html2canvas(el, {
        backgroundColor: '#0A0E1A',
        scale: 1.8,
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        ...options
      });
      
      if (canvas.width < 100 || canvas.height < 100) {
        console.warn('[Export] Canvas muito pequeno para', selector, canvas.width, canvas.height);
        return null;
      }
      
      return {
        data: canvas.toDataURL('image/png', 0.95),
        width: canvas.width,
        height: canvas.height
      };
    } catch (e) {
      console.warn('[Export] Falha ao capturar', selector, e);
      return null;
    }
  }
  
  // Slide WIDE: 13.33 x 7.5 polegadas
  const SLIDE_W = 13.33;
  const SLIDE_H = 7.5;
  
  function addCoverSlide(pptx) {
    const slide = pptx.addSlide();
    slide.background = { color: '0A0E1A' };
    
    // Faixa dourada superior
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: 0.12,
      fill: { color: 'FCD34D' }, line: { color: 'FCD34D' }
    });
    
    // Faixa dourada inferior fina
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.38, w: SLIDE_W, h: 0.12,
      fill: { color: 'FCD34D' }, line: { color: 'FCD34D' }
    });
    
    // Pequeno "ano" eyebrow
    slide.addText('2026', {
      x: 0.6, y: 0.5, w: 2, h: 0.4,
      fontSize: 11, bold: true,
      color: 'FCD34D', fontFace: 'Calibri',
      charSpacing: 8
    });
    
    // Marca em cima
    slide.addText('MARCONI FOODS', {
      x: 0.6, y: 1.0, w: 12, h: 0.5,
      fontSize: 14, bold: true,
      color: 'FFFFFF', fontFace: 'Calibri',
      charSpacing: 12
    });
    
    // Linha decorativa
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6, y: 3.4, w: 1.2, h: 0,
      line: { color: 'FCD34D', width: 4 }
    });
    
    // Título principal — centralizado verticalmente
    slide.addText('Performance', {
      x: 0.6, y: 3.6, w: 12, h: 1.1,
      fontSize: 60, bold: true,
      color: 'FFFFFF', fontFace: 'Calibri'
    });
    slide.addText('Financeira 2026', {
      x: 0.6, y: 4.5, w: 12, h: 1.1,
      fontSize: 60, bold: true,
      color: 'FCD34D', fontFace: 'Calibri'
    });
    
    // Subtítulo
    slide.addText('Dashboard Financeiro Executivo · Relatório Diretoria', {
      x: 0.6, y: 5.9, w: 12, h: 0.4,
      fontSize: 14,
      color: '94A0B8', fontFace: 'Calibri',
      charSpacing: 3
    });
    
    // Footer com data
    const dataStr = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', month: 'long', year: 'numeric' 
    });
    slide.addText(`Apresentado em ${dataStr}`, {
      x: 0.6, y: 6.8, w: 12, h: 0.3,
      fontSize: 10,
      color: '5A6580', fontFace: 'Calibri',
      charSpacing: 2
    });
  }
  
  function addSectionSlide(pptx, title, subtitle, capture) {
    if (!capture || !capture.data) return false;
    
    const slide = pptx.addSlide();
    slide.background = { color: '0A0E1A' };
    
    // Faixa dourada superior
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: 0.08,
      fill: { color: 'FCD34D' }, line: { color: 'FCD34D' }
    });
    
    // Eyebrow
    if (subtitle) {
      slide.addText(subtitle.toUpperCase(), {
        x: 0.5, y: 0.25, w: 12, h: 0.3,
        fontSize: 9, bold: true,
        color: 'FCD34D', fontFace: 'Calibri',
        charSpacing: 5
      });
    }
    
    // Título
    slide.addText(title, {
      x: 0.5, y: 0.55, w: 12, h: 0.6,
      fontSize: 22, bold: true,
      color: 'FFFFFF', fontFace: 'Calibri'
    });
    
    // Calcula tamanho ótimo da imagem mantendo proporção
    const aspectRatio = capture.width / capture.height;
    const availW = 12.3;
    const availH = 5.7;
    const availRatio = availW / availH;
    
    let imgW, imgH, imgX, imgY;
    
    if (aspectRatio > availRatio) {
      // Imagem mais larga que o slide — limita por largura
      imgW = availW;
      imgH = availW / aspectRatio;
    } else {
      // Imagem mais alta — limita por altura
      imgH = availH;
      imgW = availH * aspectRatio;
    }
    
    // Centralizar
    imgX = (SLIDE_W - imgW) / 2;
    imgY = 1.4 + (availH - imgH) / 2;
    
    slide.addImage({
      data: capture.data,
      x: imgX, y: imgY, w: imgW, h: imgH
    });
    
    // Footer
    slide.addText('Marconi Foods · Performance Financeira 2026', {
      x: 0.5, y: 7.2, w: 12, h: 0.2,
      fontSize: 8,
      color: '5A6580', fontFace: 'Calibri',
      charSpacing: 2
    });
    
    return true;
  }
  
  function addClosingSlide(pptx) {
    const slide = pptx.addSlide();
    slide.background = { color: '0A0E1A' };
    
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SLIDE_W, h: 0.12,
      fill: { color: 'FCD34D' }, line: { color: 'FCD34D' }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.38, w: SLIDE_W, h: 0.12,
      fill: { color: 'FCD34D' }, line: { color: 'FCD34D' }
    });
    
    slide.addText('Obrigado.', {
      x: 0.5, y: 2.8, w: 12.3, h: 1.2,
      fontSize: 64, bold: true,
      color: 'FFFFFF', fontFace: 'Calibri',
      align: 'center'
    });
    
    slide.addShape(pptx.ShapeType.line, {
      x: 6.1, y: 4.4, w: 1.2, h: 0,
      line: { color: 'FCD34D', width: 3 }
    });
    
    slide.addText('Marconi Foods', {
      x: 0.5, y: 4.7, w: 12.3, h: 0.4,
      fontSize: 14, bold: true,
      color: 'FCD34D', fontFace: 'Calibri',
      align: 'center', charSpacing: 6
    });
    
    slide.addText('Dúvidas e considerações ficam à disposição.', {
      x: 0.5, y: 5.3, w: 12.3, h: 0.3,
      fontSize: 12,
      color: '94A0B8', fontFace: 'Calibri',
      align: 'center', italic: true
    });
  }
  
  async function exportToPPTX() {
    showOverlay();
    
    try {
      await loadDependencies(updateStatus);
      
      updateStatus('Preparando apresentação...', 12);
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.title = 'Marconi Foods - Performance Financeira 2026';
      pptx.author = 'Consultoria Financeira';
      
      const originalPage = document.body.dataset.page || 'director';
      const originalCollapsed = document.body.classList.contains('sidebar-collapsed');
      
      // Colapsar sidebar pra ter mais área útil
      if (!originalCollapsed) {
        document.body.classList.add('sidebar-collapsed');
        await waitFor(500);
      }
      
      // CAPA
      updateStatus('Criando capa...', 18);
      addCoverSlide(pptx);
      
      // DIRETORIA
      updateStatus('Capturando Diretoria...', 28);
      if (typeof window.setDashboardPage === 'function') {
        window.setDashboardPage('director');
      } else {
        document.body.dataset.page = 'director';
      }
      await waitFor(1200);
      window.scrollTo(0, 0);
      await waitFor(400);
      
      const dirCapture = await captureElement('#directoria');
      if (dirCapture) {
        addSectionSlide(pptx, 'Visão Executiva', 'Diretoria · Resumo', dirCapture);
      }
      
      // FLUXO DE CAIXA
      updateStatus('Capturando Fluxo de Caixa...', 42);
      if (typeof window.setDashboardPage === 'function') {
        window.setDashboardPage('cash');
      } else {
        document.body.dataset.page = 'cash';
      }
      await waitFor(1200);
      window.scrollTo(0, 0);
      await waitFor(400);
      
      updateStatus('Capturando indicadores...', 50);
      const kpisCapture = await captureElement('#kpis');
      if (kpisCapture) {
        addSectionSlide(pptx, 'Indicadores-Chave do Período', 'Fluxo de Caixa · KPIs', kpisCapture);
      }
      
      updateStatus('Capturando evolução mensal...', 60);
      const monthlyCapture = await captureElement('#monthly');
      if (monthlyCapture) {
        addSectionSlide(pptx, 'Evolução Mês a Mês', 'Fluxo de Caixa · Performance', monthlyCapture);
      }
      
      updateStatus('Capturando ranking de categorias...', 76);
      // Scroll first then capture (categorias está mais embaixo)
      const catsEl = document.querySelector('#categories');
      if (catsEl) {
        catsEl.scrollIntoView({ behavior: 'instant', block: 'start' });
        await waitFor(800);
      }
      const catsCapture = await captureElement('#categories');
      if (catsCapture) {
        addSectionSlide(pptx, 'Ranking de Categorias', 'Fluxo de Caixa · Análise', catsCapture);
      }
      
      // CUSTOS FIXOS
      updateStatus('Capturando Custos Fixos...', 85);
      if (typeof window.setDashboardPage === 'function') {
        window.setDashboardPage('fixed');
      } else {
        document.body.dataset.page = 'fixed';
      }
      await waitFor(1500);
      window.scrollTo(0, 0);
      await waitFor(400);
      
      const fixedCapture = await captureElement('#fixed-costs') ||
                           await captureElement('.fixed-costs-section');
      if (fixedCapture) {
        addSectionSlide(pptx, 'Estrutura Fixa e Controle Orçamentário', 'Custos Fixos · Análise', fixedCapture);
      }
      
      // FINAL
      updateStatus('Criando slide de encerramento...', 92);
      addClosingSlide(pptx);
      
      // Restaurar
      if (typeof window.setDashboardPage === 'function') {
        window.setDashboardPage(originalPage);
      }
      if (!originalCollapsed) {
        document.body.classList.remove('sidebar-collapsed');
      }
      window.scrollTo(0, 0);
      
      // DOWNLOAD
      updateStatus('Gerando arquivo PowerPoint...', 96);
      const dataStr = new Date().toISOString().slice(0, 10);
      await pptx.writeFile({ 
        fileName: `Marconi-Foods-Performance-${dataStr}.pptx` 
      });
      
      updateStatus('✓ Apresentação pronta! Download iniciado.', 100);
      await waitFor(1500);
      
    } catch (err) {
      console.error('[Export PPTX] Erro:', err);
      updateStatus('Erro ao gerar apresentação. Veja o console (F12).', 0);
      await waitFor(3000);
    } finally {
      hideOverlay();
    }
  }
  
  function attachToButton() {
    const buttons = document.querySelectorAll('button, a');
    let target = null;
    buttons.forEach(b => {
      const text = b.textContent.trim().toUpperCase();
      if (text.includes('EXPORTAR') && (text.includes('PDF') || text.includes('APRESENTAÇÃO'))) {
        target = b;
      }
    });
    
    if (target) {
      // Atualizar texto se ainda for "EXPORTAR PDF"
      const html = target.innerHTML;
      if (html.toUpperCase().includes('EXPORTAR PDF')) {
        target.innerHTML = html.replace(/EXPORTAR\s*PDF/i, 'EXPORTAR APRESENTAÇÃO');
      }
      
      // Substituir handlers
      const newBtn = target.cloneNode(true);
      target.parentNode.replaceChild(newBtn, target);
      
      newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        exportToPPTX();
      });
      
      console.log('[PATCH v57] Botão Exportar Apresentação conectado');
      return true;
    }
    return false;
  }
  
  function init() {
    if (!attachToButton()) {
      setTimeout(attachToButton, 500);
      setTimeout(attachToButton, 1500);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  window.exportToPPTX = exportToPPTX;
  console.log('[PATCH v57] Export PowerPoint refinado disponível');
})();
