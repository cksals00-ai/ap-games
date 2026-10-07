from pathlib import Path
from build import shell,out
for l in ['ko','en']:
 ko=l=='ko'
 cards=[]
 for game,name,desc in [('quiz','퀴즈랭커' if ko else 'QuizRanker','아는 순간, 부저. 웹 연습부터 시작하세요.' if ko else 'Hit the buzzer. Start with web practice.'),('hotel','호텔랭커' if ko else 'HotelRanker','경쟁 요금·시즌·마케팅으로 호텔을 운영하세요.' if ko else 'Run a hotel with pricing, seasons and marketing.'),('invest','투자랭커' if ko else 'InvestRanker','차트와 뉴스를 읽고 투자 전략을 세우세요.' if ko else 'Read charts and news, then choose your strategy.')]:
  logo={'quiz':'quizranker-logo.png','hotel':'hotelranker-transparent.png','invest':'investranker-transparent.png'}[game]
  cards.append(f'<article class="hcard"><img class="hub-logo" src="/assets/play/{logo}" alt="{name}"><span class="eyebrow">RANKERS</span><h2>{name}</h2><p>{desc}</p><a class="btn" href="/ko/play/?game={game}">'+('웹 게임 시작' if ko else 'Play on web')+'</a></article>')
 body='<section class="page hub"><div class="wrap"><span class="eyebrow">AP GAMES / RANKERS</span><h1>'+('한 계정, 세 가지 도전.' if ko else 'One account. Three challenges.')+'</h1><p class="lead">'+('공통 로그인으로 앱과 연결된 티어와 캐릭터를 만나세요. 포인트는 게임별로 관리합니다.' if ko else 'One sign-in for your characters and tier. Points remain separate per game.')+'</p><a class="btn" href="/ko/play/">'+('AP Games 로그인 · 플레이' if ko else 'AP Games sign in & play')+'</a><div class="hgrid">'+''.join(cards)+'</div><p>'+('웹 퀴즈는 현재 연습 모드입니다. 공식 대전 연동은 검증 중입니다.' if ko else 'Web quiz currently offers practice. Ranked match integration is being verified.')+'</p></div></section>'
 out(f'/{l}/rankers/index.html',shell(l,'RANKERS | AP Games','Quiz · Hotel · Invest',f'/{l}/rankers/',body,extra_head='<link rel="stylesheet" href="/assets/play/hub.css">'))
 last='<section class="page hub"><div class="wrap"><span>LAST WAVE · '+('테스트 버전' if ko else 'TEST VERSION')+'</span><h2>LAST WAVE</h2><p>'+('무너진 서울을 배경으로 한 액션 게임. 현재 개발 테스트 단계이며 공개 웹 플레이는 준비 중입니다.' if ko else 'An action game set in fallen Seoul. A development test version; public web play is in preparation.')+'</p><a class="btn" href="/'+l+'/lastwave/">'+('테스트 버전 소개' if ko else 'About the test version')+'</a></div></section>'
 out(f'/{l}/index.html',shell(l,'AP Games — RANKERS & LAST WAVE','AP Games · RANKERS · LAST WAVE',f'/{l}/',body+last,extra_head='<link rel="stylesheet" href="/assets/play/hub.css">'))

for l in ['ko','en']:
 title='게임별 개인정보처리방침' if l=='ko' else 'Privacy policies by game'
 links=[('QuizRanker','https://www.apholdings.kr/rgrg/privacy.html'),('HotelRanker','https://www.apholdings.kr/hotelranker/privacy.html'),('InvestRanker','https://www.apholdings.kr/investranker/privacy.html'),('LAST WAVE','https://www.apholdings.kr/lastwave/')]
 body='<section class="page hub"><div class="wrap"><h1>'+title+'</h1><ul>'+''.join('<li><a href="'+url+'">'+name+'</a></li>' for name,url in links)+'</ul></div></section>'
 out('/'+l+'/privacy/index.html',shell(l,title,title,'/'+l+'/privacy/',body,extra_head='<link rel="stylesheet" href="/assets/play/hub.css">'))
