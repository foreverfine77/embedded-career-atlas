"""Build public browser data and descriptive statistics using only public inputs."""
from pathlib import Path
from collections import Counter, defaultdict
from statistics import median
import json

ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'data/jobs.public.json').read_text('utf-8'))
monthly=defaultdict(list)
for r in rows:
    if not r['intern'] and not r['experienced_post'] and r['eligibility']=='2027届明示' and r['salary_low_k'] is not None:
        monthly[r['direction']].append((r['salary_low_k']+r['salary_high_k'])/2)
statistics={
    'sample_count':len(rows),
    'intern_count':sum(r['intern'] for r in rows),
    'experienced_count':sum(r['experienced_post'] for r in rows),
    'cities':dict(Counter(r['city'] for r in rows).most_common()),
    'directions':dict(Counter(r['direction'] for r in rows).most_common()),
    'skills':dict(Counter(t for r in rows for t in set(r['tags'])).most_common()),
    'campus_monthly_midpoints':[
        {'direction':d,'n':len(values),'median_k':round(median(values),2) if len(values)>=5 else None}
        for d,values in sorted(monthly.items())
    ],
}
payload={'schemaVersion':1,'capturedOn':'2026-11-16','recordCount':len(rows),
         'originalRecordCount':231,'uniqueCount':len(rows),
         'cityCount':len(statistics['cities']),'internCount':statistics['intern_count'],
         'records':rows,'statistics':statistics}
encoded=json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
(ROOT/'assets/data.js').write_text('window.LIEPIN_DATA='+encoded+';\n','utf-8')
(ROOT/'data/statistics.json').write_text(json.dumps(statistics,ensure_ascii=False,indent=2)+'\n','utf-8')
print('Built public sample:',len(rows),'jobs,',len(statistics['cities']),'cities')


# Salary observations are separated by cohort and shown as historical ads.
groups=[
    ('明确2027届的正式岗位', [r for r in rows if not r['intern'] and not r['experienced_post'] and r['eligibility']=='2027届明示'], 'salary_high_k'),
    ('实习岗位（日薪）',[r for r in rows if r['intern']],'daily_high'),
    ('有经验社招（长期参考）',[r for r in rows if r['experienced_post']],'annual_high_wan'),
]
lines=['# 薪资标注观察清单','', '历史快照：2026-11-16。每组仅展示排序靠前的12个样本，不表示岗位仍开放，也不构成推荐或录用承诺。校招、实习与有经验社招不可混排为学习回报。','']
for label,group,field in groups:
    lines += ['## '+label,'','| 岗位 | 公司 | 城市 | 标注薪资 | 页面年资 / 届别 |','|---|---|---|---|---|']
    for r in sorted(group,key=lambda r:r[field] if r[field] is not None else -1,reverse=True)[:12]:
        cells=[r['title'],r['company'],r['city'],r['salary'],r['experience_label']+' / '+r['eligibility']]
        lines.append('| '+' | '.join(str(x).replace('|','/').replace('\n',' ') for x in cells)+' |')
    lines.append('')
lines += ['## 阅读方法','', '薪资为招聘广告标注；日薪与月薪分开。年包为月薪乘标注月数的算术折算，未标月数时不推定。请核对完整岗位要求、薪资构成和实际开放状态。更多限制见[薪资观察说明](salary-notes.md)。']
(ROOT/'docs/salary-table.md').write_text('\n'.join(lines)+'\n','utf-8')
