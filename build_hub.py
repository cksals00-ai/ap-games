from pathlib import Path
from build import shell,out

def render_home(l):
 s=Path('home-v2.html').read_text()
 if l=='en':
  translations={
   '이번 주 추천 · 웹에서 바로 플레이':'Featured this week · Play on web',
   '아는 순간,<br>부저를 눌러라':'Know the answer?<br>Hit the buzzer.',
   '퀴즈랭커를 설치 없이 웹에서 연습해 보세요. 부저를 누르고 제한 시간 안에 정답을 골라요.':'Try QuizRanker in your browser. Hit the buzzer and answer before time runs out.',
   '▶ 지금 플레이':'▶ Play now', '다른 게임 보기 →':'Explore games →',
   '티어 공유 · 포인트는 게임별':'Shared tier · Separate game points',
   '웹 베타 · 퀴즈는 연습 모드입니다. LAST WAVE는 테스트 버전 소개이며 공개 플레이는 준비 중입니다.':'Web beta · Quiz offers practice. LAST WAVE is a test preview; public play is in preparation.',
   '모든 게임':'All games','로그인':'Sign in','홈':'Home',
   '부저로 즐기는 퀴즈 연습':'Buzzer quiz practice','웹 연습':'Web practice',
   '차트와 뉴스로 투자 대결':'Invest with charts and news','호텔 경영 시뮬레이션':'Hotel management simulation',
   '웹 플레이':'Web play','무너진 서울, 생존 액션':'Survival action in fallen Seoul','테스트 버전':'Test version',
   '어떻게 하나요':'How it works','AP 계정 하나로 모든 게임을 이용해요.':'One AP account for all games.',
   '아무 게임이나 플레이':'Choose your game',
   '호텔·투자는 앱의 운영 기록과 이어져요. 퀴즈 연습은 RP에 반영되지 않아요.':'Hotel and Invest continue your app records. Quiz practice does not earn RP.',
   '티어 올리기':'Build your tier','RANKERS 티어는 세 랭커 게임에서 함께 보여요.':'Your RANKERS tier appears across all three Ranker games.',
   '게임별 개인정보처리방침':'Game privacy policies','회사 홈페이지':'Company website',
   '퀴즈랭커':'QuizRanker','투자랭커':'InvestRanker','호텔랭커':'HotelRanker',' 로고':' logo'
  }
  for a,b in translations.items():s=s.replace(a,b)
  s=s.replace('lang="ko"','lang="en"').replace('href="/ko/"','href="/en/"').replace('href="/ko/rankers/"','href="/en/rankers/"').replace('/ko/lastwave/','/en/lastwave/').replace('/ko/privacy/','/en/privacy/').replace('apholdings.kr/ko/','apholdings.kr/en/')
  s=s.replace("https://games.apholdings.kr/en/play/","https://games.apholdings.kr/ko/play/")
 return s

for l in ['ko','en']:
 ko=l=='ko'
 cards=[]
 for game,name,desc in [('quiz','퀴즈랭커' if ko else 'QuizRanker','아는 순간, 부저. 웹 연습부터 시작하세요.' if ko else 'Hit the buzzer. Start with web practice.'),('hotel','호텔랭커' if ko else 'HotelRanker','경쟁 요금·시즌·마케팅으로 호텔을 운영하세요.' if ko else 'Run a hotel with pricing, seasons and marketing.'),('invest','투자랭커' if ko else 'InvestRanker','차트와 뉴스를 읽고 투자 전략을 세우세요.' if ko else 'Read charts and news, then choose your strategy.')]:
  logo={'quiz':'quizranker-logo.png','hotel':'hotelranker-transparent.png','invest':'investranker-transparent.png'}[game]
  cards.append(f'<article class="hcard"><img class="hub-logo" src="/assets/play/{logo}" alt="{name}"><span class="eyebrow">RANKERS</span><h2>{name}</h2><p>{desc}</p><a class="btn" href="/ko/play/?game={game}">'+('웹 게임 시작' if ko else 'Play on web')+'</a></article>')
 body='<section class="page hub"><div class="wrap"><span class="eyebrow">AP GAMES / RANKERS · WEB BETA</span><h1>'+('한 계정, 세 가지 도전.' if ko else 'One account. Three challenges.')+'</h1><p class="lead">'+('공통 로그인으로 앱과 연결된 티어와 캐릭터를 만나세요. 포인트는 게임별로 관리합니다.' if ko else 'One sign-in for your characters and tier. Points remain separate per game.')+'</p><a class="btn" href="/ko/play/">'+('AP Games 로그인 · 플레이' if ko else 'AP Games sign in & play')+'</a><div class="hgrid">'+''.join(cards)+'</div><p>'+('웹 퀴즈는 현재 연습 모드입니다. 공식 대전 연동은 검증 중입니다.' if ko else 'Web quiz currently offers practice. Ranked match integration is being verified.')+'</p></div></section>'
 out(f'/{l}/rankers/index.html',shell(l,'RANKERS | AP Games','Quiz · Hotel · Invest',f'/{l}/rankers/',body,extra_head='<link rel="stylesheet" href="/assets/play/hub.css?v=20261008-4">'))
 last='<section class="page hub"><div class="wrap"><span>LAST WAVE · '+('테스트 버전' if ko else 'TEST VERSION')+'</span><h2>LAST WAVE</h2><p>'+('무너진 서울을 배경으로 한 액션 게임. 현재 개발 테스트 단계이며 공개 웹 플레이는 준비 중입니다.' if ko else 'An action game set in fallen Seoul. A development test version; public web play is in preparation.')+'</p><a class="btn" href="/'+l+'/lastwave/">'+('테스트 버전 소개' if ko else 'About the test version')+'</a></div></section>'
 out(f'/{l}/index.html',render_home(l))

for l in ['ko','en']:
 title='게임별 개인정보처리방침' if l=='ko' else 'Privacy policies by game'
 links=[('QuizRanker','https://www.apholdings.kr/rgrg/privacy.html'),('HotelRanker','https://www.apholdings.kr/hotelranker/privacy.html'),('InvestRanker','https://www.apholdings.kr/investranker/privacy.html'),('LAST WAVE','https://www.apholdings.kr/lastwave/')]
 body='<section class="page hub"><div class="wrap"><h1>'+title+'</h1><ul>'+''.join('<li><a href="'+url+'">'+name+'</a></li>' for name,url in links)+'</ul></div></section>'
 out('/'+l+'/privacy/index.html',shell(l,title,title,'/'+l+'/privacy/',body,extra_head='<link rel="stylesheet" href="/assets/play/hub.css?v=20261008-4">'))
