# AP Games 홈 = LAST WAVE. 랭커 웹 게임(퀴즈·호텔·투자)은 2026-10-28 대표 지시로 사이트에서 내렸다.
# 옛 주소(/xx/rankers/, /ko/play/)는 LAST WAVE 로 넘긴다. 랭커 앱 소개는 apholdings.kr/rankers 에 있다.
from pathlib import Path
from build import out, ORIGIN

def redirect(to):
 return f'<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url={to}"><link rel="canonical" href="{ORIGIN}{to}"><script>location.replace("{to}")</script></head><body></body></html>'

for l in ['ko','en']:
 # 홈: LAST WAVE 페이지와 같은 내용, 주소만 /xx/
 s=Path(f'{l}/lastwave/index.html').read_text()
 s=s.replace(f'<link rel="canonical" href="{ORIGIN}/{l}/lastwave/">',f'<link rel="canonical" href="{ORIGIN}/{l}/">')
 other='en' if l=='ko' else 'ko'
 s=s.replace(f'hreflang="{other}" href="{ORIGIN}/{other}/lastwave/"',f'hreflang="{other}" href="{ORIGIN}/{other}/"')
 s=s.replace(f'<meta property="og:url" content="{ORIGIN}/{l}/lastwave/">',f'<meta property="og:url" content="{ORIGIN}/{l}/">')
 s=s.replace(f'<a class="lang" href="/{other}/lastwave/">',f'<a class="lang" href="/{other}/">')
 out(f'/{l}/index.html',s)
 out(f'/{l}/rankers/index.html',redirect(f'/{l}/lastwave/'))

out('/ko/play/index.html',redirect('/ko/lastwave/'))

for l in ['ko','en']:
 title='게임별 개인정보처리방침' if l=='ko' else 'Privacy policies by game'
 links=[('QuizRanker','https://www.apholdings.kr/rgrg/privacy.html'),('HotelRanker','https://www.apholdings.kr/hotelranker/privacy.html'),('InvestRanker','https://www.apholdings.kr/investranker/privacy.html'),('LAST WAVE','https://www.apholdings.kr/lastwave/')]
 body='<section class="page hub"><div class="wrap"><h1>'+title+'</h1><ul>'+''.join('<li><a href="'+url+'">'+name+'</a></li>' for name,url in links)+'</ul></div></section>'
 from build import shell
 out('/'+l+'/privacy/index.html',shell(l,title,title,'/'+l+'/privacy/',body,extra_head='<link rel="stylesheet" href="/assets/play/hub.css?v=20261008-4">'))
