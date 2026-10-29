"""Idempotently attach AP's shared, public-page-only measurement tag."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent.parent
TAG='<script defer data-ap-analytics src="https://www.apholdings.kr/analytics/ap-analytics.js?v=20261029"></script>'
BLOCK={'admin','auth','checkout','cart','submit','qna','support','docs','tests','_backup_20260919','_to_delete','site-source','newsletters','.git'}
main=(ROOT/'CNAME').read_text().strip()=='www.apholdings.kr'
count=0
for p in ROOT.rglob('*.html'):
 rel=p.relative_to(ROOT)
 if any(x in BLOCK or x.startswith('_backup') for x in rel.parts): continue
 if main and rel.parts[0] not in {'ko','en','ja','vi','fr','zh-cn','index.html'}: continue
 s=p.read_text(encoding='utf-8')
 if 'data-ap-analytics' in s or not re.search('</head>',s,re.I): continue
 p.write_text(re.sub('</head>',TAG+'</head>',s,count=1,flags=re.I),encoding='utf-8');count+=1
print(f'{ROOT.name}: {count} public pages tagged')
