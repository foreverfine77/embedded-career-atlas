(() => {
  'use strict';
  const data = window.LIEPIN_DATA;
  const rows = data.records;
  const byId = new Map(rows.map(r => [r.id, r]));
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { q: '', city: '', direction: '', eligibility: '', type: 'all', sort: 'original', page: 1 };
  const pageSize = 12;
  let matches = rows;
  const eligibleCode = r => r.experienced_post ? 'experienced' : r.eligibility === '2027届明示' ? '2027' : r.intern ? 'intern' : 'uncertain';
  const kind = r => r.intern ? ['实习', 'intern'] : r.experienced_post ? ['社招参考', 'experienced'] : r.eligibility === '2027届明示' ? ['2027 校招', 'campus'] : ['正式岗位', ''];
  const normalizedDescription = r => String(r.description || '').replace(/\\n/g, '\n').replace(/\r\n?/g, '\n');
  const education = r => r.education || '学历待确认';
  const shortCompany = r => (r.company || '企业').replace(/[()（）]/g, '').slice(0, 2);
  const moneyCaption = r => r.intern ? '招聘标注 · 日薪' : '招聘标注 · 月薪';
  const annual = r => r.annual_high_wan != null ? `标注年包折算 ${r.annual_low_wan}–${r.annual_high_wan} 万元` : r.intern ? '实习日薪，未折算为年薪' : '未标注薪资月数，未折算为年薪';

  function addOptions(id, values) {
    values.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; $(id).appendChild(option); });
  }
  const cities = [...new Set(rows.map(r => r.city))].sort((a,b) => a.localeCompare(b,'zh-CN'));
  addOptions('city', cities);
  addOptions('direction', [...new Set(rows.map(r => r.direction))]);
  $('metric-records').innerHTML = `${data.recordCount}<small>条</small>`;
  $('metric-unique').innerHTML = `${data.cityCount}<small>个</small>`;
  $('metric-interns').innerHTML = `${data.internCount}<small>个</small>`;

  function card(r) {
    const [label, cls] = kind(r);
    const tags = r.tags.slice(0, 5).map(t => `<span class="skill-tag">${escape(t)}</span>`).join('') + (r.tags.length > 5 ? `<span class="skill-tag">+${r.tags.length-5}</span>` : '');
    const excerpt = normalizedDescription(r).replace(/\s+/g, ' ').trim();
    const preview = excerpt.length > 128 ? excerpt.slice(0,128) + '…' : excerpt;
    return `<article class="job-card" data-record="${r.id}">
      <div class="card-company"><div class="company-monogram tone-${r.id % 4}" aria-hidden="true">${escape(shortCompany(r))}</div><div class="card-company-text"><div class="company-name" title="${escape(r.company)}">${escape(r.company)}</div><div class="record-id">RECORD ${String(r.id).padStart(3,'0')}</div></div><span class="job-kind ${cls}">${label}</span></div>
      <h2 class="job-title"><button data-open="${r.id}">${escape(r.title)}</button></h2>
      <div class="pay-row"><strong class="job-pay">${escape(r.salary || '薪资面议')}</strong><span class="pay-caption">${moneyCaption(r)}</span></div>
      <div class="job-meta"><span>${escape(r.city_detail)}</span><span>${escape(education(r))}</span><span>${escape(r.experience_label || '要求见原文')}</span></div>
      <div class="skill-tags">${tags}</div><p class="job-preview">${escape(preview)}</p>
      <div class="card-bottom"><span class="direction-label">${escape(r.direction)}</span><button class="detail-button" data-open="${r.id}" aria-label="查看${escape(r.title)}的岗位摘要">查看职位<span>→</span></button></div></article>`;
  }

  function baseFilter(r) {
    if (state.city && r.city !== state.city) return false;
    if (state.direction && r.direction !== state.direction) return false;
    if (state.eligibility && eligibleCode(r) !== state.eligibility) return false;
    if (state.q) {
      const haystack = [r.title,r.company,r.city_detail,r.description,r.direction,r.eligibility,...r.tags,...r.notes].join(' ').toLocaleLowerCase();
      if (!state.q.split(/\s+/).every(word => haystack.includes(word))) return false;
    }
    return true;
  }

  function render() {
    const base = rows.filter(baseFilter);
    $('count-all').textContent = base.length;
    $('count-intern').textContent = base.filter(r=>r.intern).length;
    $('count-formal').textContent = base.filter(r=>!r.intern).length;
    matches = base.filter(r => state.type === 'all' || (state.type === 'intern' ? r.intern : !r.intern));
    const sortField = {monthly:'salary_high_k',daily:'daily_high',annual:'annual_high_wan'}[state.sort];
    if (sortField) matches.sort((a,b)=>(b[sortField] ?? -1)-(a[sortField] ?? -1)||a.id-b.id);
    else matches.sort((a,b)=>a.id-b.id);
    const pages = Math.max(1, Math.ceil(matches.length/pageSize));
    state.page = Math.min(Math.max(1,state.page),pages);
    const start = (state.page-1)*pageSize;
    $('result-count').textContent = `找到 ${matches.length} 条记录`;
    $('job-grid').innerHTML = matches.slice(start,start+pageSize).map(card).join('');
    $('empty-state').hidden = matches.length !== 0;
    $('pagination').hidden = matches.length === 0;
    const filters = [state.q && `关键词：${state.q}`, state.city, state.direction, state.eligibility && $('eligibility').selectedOptions[0].textContent].filter(Boolean);
    $('active-filters').innerHTML = filters.map(t=>`<span class="filter-token">${escape(t)}</span>`).join('');
    const pageNumbers = [...new Set([1,state.page-1,state.page,state.page+1,pages])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);
    let last=0;
    const nums = pageNumbers.map(n=>{const gap=last && n-last>1 ? '<span class="page-gap">…</span>' : '';last=n;return `${gap}<button data-page="${n}" aria-label="第${n}页" ${n===state.page?'aria-current="page"':''}>${n}</button>`;}).join('');
    $('pagination').innerHTML = `<span>显示第 ${matches.length?start+1:0}–${Math.min(start+pageSize,matches.length)} 条，共 ${matches.length} 条</span><div class="page-buttons"><button data-page="${state.page-1}" ${state.page===1?'disabled':''}>← 上一页</button>${nums}<button data-page="${state.page+1}" ${state.page===pages?'disabled':''}>下一页 →</button></div>`;
    document.querySelectorAll('[data-type]').forEach(b=>{const on=b.dataset.type===state.type;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
  }

  function reset() {
    Object.assign(state,{q:'',city:'',direction:'',eligibility:'',type:'all',sort:'original',page:1});
    ['q','city','direction','eligibility'].forEach(id=>$(id).value='');$('sort').value='original';render();
  }
  ['city','direction','eligibility','sort'].forEach(id=>$(id).addEventListener('change',()=>{state[id]=$(id).value;state.page=1;render();}));
  $('q').addEventListener('input',()=>{state.q=$('q').value.trim().toLocaleLowerCase();state.page=1;render();});
  $('reset').addEventListener('click',reset);$('empty-reset').addEventListener('click',reset);
  document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{state.type=b.dataset.type;state.page=1;render();}));
  $('pagination').addEventListener('click',event=>{const b=event.target.closest('button[data-page]');if(!b||b.disabled)return;state.page=Number(b.dataset.page);render();$('results-top').scrollIntoView({block:'start'});});

  function openJob(id) {
    const r=byId.get(Number(id));if(!r)return;
    const [label,cls]=kind(r);
    $('dialog-record').textContent=`岗位摘要 / RECORD ${String(r.id).padStart(3,'0')}`;
    $('dialog-body').innerHTML=`<div class="dialog-company">${escape(r.company)}</div><h2 id="dialog-title">${escape(r.title)}</h2><div class="dialog-pay">${escape(r.salary)}</div><div class="dialog-annual">${escape(annual(r))}</div><div class="dialog-facts"><span>${escape(r.city_detail)}</span><span>${escape(education(r))}</span><span>${escape(r.experience_label||'经验见原文')}</span><span>${escape(r.eligibility)}</span></div><div class="skill-tags">${r.tags.map(t=>`<span class="skill-tag">${escape(t)}</span>`).join('')}</div>${r.notes.length?`<div class="dialog-note">${r.notes.map(escape).join('<br>')}</div>`:''}<div class="dialog-section-heading">岗位观察与学习摘要</div><pre class="jd-text"></pre><details class="source-note"><summary>查看数据来源与摘要说明</summary><p>猎聘手机页面 · 采集日期 ${escape(data.capturedOn)}<br>公开字段与整理摘要，统计口径见项目文档。<br>当前展示为结构化字段整理的摘要，不是招聘方完整职位原文；请以平台最新信息为准。</p></details>`;
    $('dialog-body').querySelector('.jd-text').textContent=normalizedDescription(r);
    $('job-dialog').showModal();$('dialog-body').scrollTop=0;
  }
  $('job-grid').addEventListener('click',event=>{const b=event.target.closest('[data-open]');if(b)openJob(b.dataset.open);});
  $('dialog-close').addEventListener('click',()=>$('job-dialog').close());
  $('job-dialog').addEventListener('click',event=>{if(event.target===$('job-dialog')){const r=$('job-dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('job-dialog').close();}});
  function setView(view) {
    ['jobs','analysis','route'].forEach(name => $(name+'-view').hidden = name !== view);
    $('breadcrumb-current').textContent = {jobs:'岗位探索',analysis:'样本分析',route:'学习路线'}[view] || '岗位探索';
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    window.scrollTo(0,0);
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelector('.brand').addEventListener('click',()=>setView('jobs'));

  function bars(id, entries, limit) {
    const pairs=entries.slice(0,limit),max=Math.max(...pairs.map(x=>x[1]),1);
    $(id).innerHTML=pairs.map(([name,value])=>`<div class="chart-row"><div><span>${escape(name)}</span><b>${value}</b></div><div class="bar-track"><i style="width:${value/max*100}%"></i></div></div>`).join('');
  }
  bars('chart-skills',Object.entries(data.statistics.skills),9);
  bars('chart-cities',Object.entries(data.statistics.cities),9);
  $('salary-observations').innerHTML=data.statistics.campus_monthly_midpoints.map(r=>`<div class="salary-observation"><span>${escape(r.direction)}</span><small>n = ${r.n}</small><b>${r.median_k == null ? '样本不足' : r.median_k+' k/月'}</b></div>`).join('');
  render();
})();
