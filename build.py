# -*- coding: utf-8 -*-
"""AP Games — LAST WAVE 사이트 빌더. python3 build.py → site/ 에 정적 파일."""
import os, json, html
from content import HEROES, THREATS, BOSSES, ARENAS, NEWS
OUT='.'; ORIGIN='https://games.apholdings.kr'
e=html.escape
T={
 'ko':dict(lang='ko',other='en',otherLabel='EN',nav=[('/ko/','홈'),('/ko/heroes/','영웅'),('/ko/threats/','위협'),('/ko/arenas/','아레나'),('/ko/news/','소식'),('/ko/board/','게시판')],
   heroTitle=('무너진 서울.','마지막 파도.'),heroLead='리얼 3D 1인칭 슈터(FPS). 무너진 서울 한복판에서 끝없이 밀려오는 파도를 버텨라. 영웅 다섯, 위협 아홉, 열한 구역.',
   genre='웨이브 서바이벌 · iOS',feat=[('3D','리얼 3D','반실사 캐릭터와 무너진 서울을 Unity 실시간 3D로. 비 젖은 아스팔트에 네온이 번진다.'),('FPS','1인칭 슈팅','100 스테이지, 눈앞까지 달려드는 적. 조준하고, 쏘고, 버틴다. 3인칭 아레나 모드도 함께.'),('50','50 웨이브','웨이브마다 강해지는 적 7종과 보스 2. 매 판 다른 강화 카드로 빌드를 짠다.')],featTitle='3D FPS',featLead='손 안에서 도는 리얼 3D 1인칭 슈터.',cta='영웅 보기',cta2='인트로 보기',roster='영웅',rosterLead='다섯 명. 각자 다른 이유로 서 있다.',threats='위협',threatsLead='한 마리가 더 무섭게. 적 7, 보스 5.',
   arenas='아레나',arenasLead='무너진 서울 열한 구역 · 웨이브 50.',news='소식',all='전체 보기',role='역할',hpL='HP',combo='콤보',skills='기술',
   detail='자세히',profile='프로필',story='이야기',wave='등장 웨이브',dmg='공격',spd='속도',kind='행동',phases='페이즈',
   soon='아트 준비 중 — 원본 디자인 기준으로 제작 중입니다.',turn='3D 턴테이블 · 드래그해서 돌려 보세요',turnNote='PIXEL 3D 모델 실험판(v1). 최종 인게임 모델이 아닙니다.',
   platform='iOS · App Store (준비 중)',studio='AP Games는 A.P Holdings의 게임 레이블입니다.',privacy='개인정보처리방침',company='회사',
   waves='웨이브',boss='보스',enemy='적',footer_note='LAST WAVE © 2026 AP Games / A.P Holdings. 모든 캐릭터·아트·설정은 AP Games의 자산입니다.'),
 'en':dict(lang='en',other='ko',otherLabel='KO',nav=[('/en/','Home'),('/en/heroes/','Heroes'),('/en/threats/','Threats'),('/en/arenas/','Arenas'),('/en/news/','News'),('/en/board/','Community')],
   heroTitle=('A fallen Seoul.','The last wave.'),heroLead='A real-3D first-person shooter. Hold the line in the ruins of Seoul as the waves keep coming. Five heroes, nine threats, eleven districts.',
   genre='Wave survival · iOS',feat=[('3D','Real 3D','Semi-realistic heroes and a broken Seoul, rendered live in Unity. Neon bleeding across wet asphalt.'),('FPS','First-person','100 stages, enemies rushing right into your face. Aim, fire, hold. A third-person arena mode too.'),('50','50 waves','Seven enemy types and two bosses that grow with every wave. New upgrade cards each run.')],featTitle='3D FPS',featLead='A real-3D first-person shooter in your hand.',cta='Meet the heroes',cta2='Watch the intro',roster='Heroes',rosterLead='Five of them. Each standing for a different reason.',threats='Threats',threatsLead='Fewer, but each one worse. 7 enemies, 5 bosses.',
   arenas='Arenas',arenasLead='Eleven districts of a fallen Seoul · 50 waves.',news='News',all='See all',role='Role',hpL='HP',combo='Combo',skills='Skills',
   detail='Details',profile='Profile',story='Story',wave='First wave',dmg='Damage',spd='Speed',kind='Behavior',phases='Phases',
   soon='Art in production — built from the original design.',turn='3D turntable · drag to rotate',turnNote='PIXEL 3D model, experimental v1. Not the final in-game model.',
   platform='iOS · App Store (coming)',studio='AP Games is the games label of A.P Holdings.',privacy='Privacy policy',company='Company',
   waves='Waves',boss='Boss',enemy='Enemy',footer_note='LAST WAVE © 2026 AP Games / A.P Holdings. All characters, art and lore are assets of AP Games.'),
}
ROLE_EN={'MAIN':'Main','MEDIC':'Medic','STARTER':'Starter','DRAGONS':'Double Dragon','BLADE':'Blade'}

def glyph(k):
    d={'wave':'M4 22c4-8 8-8 12 0s8 8 12 0','pulse':'M4 16h6l3-8 4 16 3-8h8','blink':'M16 4l4 8 8 4-8 4-4 8-4-8-8-4 8-4z','pillar':'M16 4v24M10 28h12M12 10l4-6 4 6',
       'link':'M11 16a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1 1M21 16a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1-1','burst':'M16 5v6M16 21v6M5 16h6M21 16h6M8 8l4 4M20 20l4 4M24 8l-4 4M12 20l-4 4',
       'shield':'M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8z','all':'M16 27s-9-6-9-13a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 13-9 13z','dash':'M4 16h16M14 8l8 8-8 8M24 8v16',
       'punch':'M8 14h12v10H8zM20 16h6v6h-6zM10 10v4M14 8v6M18 10v4','guard':'M16 5l9 4v7c0 6-4 10-9 11-5-1-9-5-9-11V9z M12 16l3 3 5-6','power':'M18 4L8 18h8l-2 10 10-14h-8z',
       'blade':'M6 26L24 8l2-2 2 2-2 2L8 28zM20 12l4 4','summon':'M10 28V12l3 4 3-6 3 6 3-4v16','magnet':'M10 6v10a6 6 0 0 0 12 0V6M8 6h4M20 6h4','multi':'M6 26L14 18M12 26L20 18M18 26L26 18M14 18l2-2M20 18l2-2M26 18l2-2'}
    return f'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="{d.get(k,d["dash"])}"/></svg>'

def shell(l,title,desc,path,body,og=None,extra_head=''):
    t=T[l]; alt=f'/{t["other"]}{path[3:]}'
    nav=''.join(f'<a href="{h}"{" class=on" if path==h or (h!=f"/{l}/" and path.startswith(h)) else ""}>{e(n)}</a>' for h,n in t['nav'])
    og=og or '/assets/art/hero_wide_s.jpg'
    return f'''<!doctype html><html lang="{l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(title)}</title>
<meta name="description" content="{e(desc,True)}"><link rel="canonical" href="{ORIGIN}{path}"><link rel="alternate" hreflang="{t['other']}" href="{ORIGIN}{alt}">
<meta property="og:title" content="{e(title,True)}"><meta property="og:description" content="{e(desc,True)}"><meta property="og:image" content="{ORIGIN}{og}"><meta property="og:url" content="{ORIGIN}{path}"><meta name="theme-color" content="#06080d">
<link rel="icon" href="/assets/ap_games_mark.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=5">{extra_head}</head><body>
<header class="top"><a class="brand" href="/{l}/"><img src="/assets/ap_games_wordmark.svg" alt="AP Games" height="22"><span class="game">LAST WAVE</span></a><nav>{nav}</nav><a class="lang" href="{alt}">{t['otherLabel']}</a></header>
<main>{body}</main>
<footer><div class="wrap"><div class="fgrid"><div><img src="/assets/ap_games_wordmark.svg" alt="AP Games" height="20"><p>{e(t['studio'])}</p></div>
<div><a href="https://www.apholdings.kr/{l}/">{e(t['company'])} — apholdings.kr</a><br><a href="https://www.apholdings.kr/lastwave/">{e(t['privacy'])}</a></div></div><p class="fine">{e(t['footer_note'])}</p></div></footer>
<script src="/assets/site.js?v=2" defer></script></body></html>'''

def out(path,text):
    p=os.path.join(OUT,path.lstrip('/')); os.makedirs(os.path.dirname(p),exist_ok=True); open(p,'w').write(text)

def hero_card(l,h):
    t=T[l]; role=h['role'] if l=='ko' else ROLE_EN[h['role']]
    img=f'<img src="/assets/art/{h["id"]}_full_s.webp" alt="{e(h["name"])}" loading="lazy">' if h['art'] else f'<div class="pending"><span>{e(t["soon"])}</span><code>{h["id"]}_full.png</code></div>'
    return f'<a class="hcard" href="/{l}/heroes/{h["id"]}/"><div class="fig">{img}</div><div class="meta"><span class="role">{e(h["roleKo"] if l=="ko" else role)}</span><h3>{e(h["name"])}</h3><p>{e(h["ko"] if l=="ko" else h["tag_en"])}</p></div></a>'

def threat_card(l,x,boss=False):
    t=T[l]; d=x['ko_d'] if l=='ko' else x['en_d']
    stats=f'<span>{t["wave"]} {x["wave"]}</span><span>{t["hpL"]} {x["hp"]:,}</span><span>{t["dmg"]} {x["dmg"]}</span>'+(f'<span>{t["phases"]} {x["phases"]}</span>' if boss else f'<span>{e(x["kind"] if l=="ko" else x["kind_en"])}</span>')
    extra=''
    if x.get('quote_ko'): extra+=f'<blockquote>“{e(x["quote_ko"] if l=="ko" else x["quote_en"])}”</blockquote>'
    if x.get('plist'): extra+='<ol class="phases">'+''.join(f'<li><b>{e(a)}</b> {e(k if l=="ko" else en)}</li>' for a,k,en in x['plist'])+'</ol>'
    if x.get('moves_ko'): extra+=f'<p class="moves"><b>{"패턴" if l=="ko" else "Patterns"}</b> {e(x["moves_ko"] if l=="ko" else x["moves_en"])}</p><p class="moves"><b>{"약점" if l=="ko" else "Weakness"}</b> {e(x["weak_ko"] if l=="ko" else x["weak_en"])}</p>'
    if x.get('final'): stats='<span class="final">FINAL</span>'+stats
    return f'<article class="tcard{" boss" if boss else ""}" id="{x["id"]}"><div class="fig"><img src="/assets/art/{x["id"]}_full_s.webp" alt="{e(x["name"])}"></div><div class="meta"><span class="role">{t["boss"] if boss else t["enemy"]}</span><h3>{e(x["name"])}<small>{e(x["ko"])}</small></h3><p>{e(d)}</p>{extra}<div class="stats">{stats}</div></div><a class="keyart" href="/assets/art/{x["id"]}_key.jpg" target="_blank" rel="noopener"><img src="/assets/art/{x["id"]}_key_s.jpg" alt="" loading="lazy"></a></article>'

for l in ('ko','en'):
    t=T[l]
    # HOME
    heroes=''.join(hero_card(l,h) for h in HEROES)
    threats=''.join(f'<a class="tmini" href="/{l}/threats/#{x["id"]}"><img src="/assets/art/{x["id"]}_full_s.webp" alt="{e(x["name"])}" loading="lazy"><b>{e(x["name"])}</b></a>' for x in THREATS+BOSSES)
    news=''.join(f'<article><time>{n[0]}</time><h3>{e(n[1] if l=="ko" else n[3])}</h3><p>{e(n[2] if l=="ko" else n[4])}</p></article>' for n in NEWS)
    feats=''.join(f'<article><b class="big">{a}</b><h3>{e(h_)}</h3><p>{e(d_)}</p></article>' for a,h_,d_ in t['feat'])
    body=f'''<section class="hero"><video class="bg" src="/assets/video/hero_loop.mp4" poster="/assets/video/hero_poster.jpg" autoplay muted loop playsinline></video><div class="shade"></div>
<div class="wrap hero-copy"><span class="eyebrow">AP GAMES PRESENTS</span><div class="genre"><b>3D</b><b>FPS</b><span>{e(t["genre"])}</span></div><h1>{e(t['heroTitle'][0])}<br>{e(t['heroTitle'][1])}</h1><p class="lead">{e(t['heroLead'])}</p>
<div class="actions"><a class="btn" href="/{l}/heroes/">{e(t['cta'])}</a><a class="btn ghost" href="#intro">{e(t['cta2'])}</a></div><p class="plat">{e(t['platform'])}</p></div></section>
<section class="feat"><div class="wrap"><div class="sh"><h2>{e(t['featTitle'])}</h2><p>{e(t['featLead'])}</p></div><div class="fgrid3">{feats}</div></div></section>
<section class="wide"><img src="/assets/art/hero_wide.jpg" alt="PIXEL — LAST WAVE key art" loading="lazy"></section>
<section class="sec"><div class="wrap"><div class="sh"><h2>{e(t['roster'])}</h2><p>{e(t['rosterLead'])}</p><a class="more" href="/{l}/heroes/">{e(t['all'])} →</a></div><div class="hgrid">{heroes}</div></div></section>
<section class="sec dark"><div class="wrap"><div class="sh"><h2>{e(t['threats'])}</h2><p>{e(t['threatsLead'])}</p><a class="more" href="/{l}/threats/">{e(t['all'])} →</a></div><div class="tstrip">{threats}</div></div><img class="band" src="/assets/art/threats_wide.jpg" alt="" loading="lazy"></section>
<section class="sec" id="intro"><div class="wrap"><div class="sh"><h2>INTRO</h2><p>{'2026 · 28초' if l=='ko' else '2026 · 28 s'}</p></div><video class="intro" src="/assets/video/opening.mp4" poster="/assets/video/hero_poster.jpg" controls preload="none" playsinline></video></div></section>
<section class="sec"><div class="wrap"><div class="sh"><h2>{e(t['news'])}</h2><a class="more" href="/{l}/news/">{e(t['all'])} →</a></div><div class="ngrid">{news}</div></div></section>'''
    out(f'/{l}/index.html',shell(l,'LAST WAVE — 3D FPS | AP Games',t['heroLead'],f'/{l}/',body))

    # HEROES list
    body=f'<section class="page"><div class="wrap"><span class="eyebrow">LAST WAVE</span><h1>{e(t["roster"])}</h1><p class="lead">{e(t["rosterLead"])}</p><div class="hgrid big">{"".join(hero_card(l,h) for h in HEROES)}</div></div></section>'
    out(f'/{l}/heroes/index.html',shell(l,f'{t["roster"]} — LAST WAVE',t['rosterLead'],f'/{l}/heroes/',body))

    # HERO pages
    for i,h in enumerate(HEROES):
        role=h['roleKo'] if l=='ko' else ROLE_EN[h['role']]
        bio=''.join(f'<p>{e(x)}</p>' for x in (h['bio_ko'] if l=='ko' else h['bio_en']))
        skills=''.join(f'<li><i class="key">{k}</i><span class="g">{glyph(g)}</span><div><b>{e(n)}</b><p>{e(dk if l=="ko" else de)}</p></div></li>' for k,n,dk,de,g in h['skills'])
        key=f'<img class="key" src="/assets/art/{h["id"]}_key.jpg" alt="{e(h["name"])} key art">' if h['art'] else f'<div class="pending key"><span>{e(t["soon"])}</span><code>{h["id"]}_key.png</code></div>'
        face=f'<img src="/assets/art/{h["id"]}_face.jpg" alt="">' if h['art'] else ''
        turn=''
        if h['id']=='pixel':
            turn=f'<section class="sec"><div class="wrap"><div class="sh"><h2>3D</h2><p>{e(t["turn"])}</p></div><model-viewer src="/assets/3d/pixel.glb" poster="/assets/3d/pixel_poster.png" alt="PIXEL 3D" camera-controls auto-rotate rotation-per-second="20deg" shadow-intensity="1" exposure="1.4" environment-image="neutral" style="width:100%;height:70vh;background:radial-gradient(circle at 50% 70%,#132033,#06080d 70%)"></model-viewer><p class="note">{e(t["turnNote"])}</p></div></section>'
        prev=HEROES[i-1]; nxt=HEROES[(i+1)%len(HEROES)]
        body=f'''<section class="hpage"><div class="art">{key}</div><div class="wrap copy"><span class="eyebrow">{e(t['role'])} · {e(role)}</span><h1>{e(h['name'])}<small>{e(h['ko'])}</small></h1><p class="tag">{e(h['tag_ko'] if l=='ko' else h['tag_en'])}</p>
<blockquote>“{e(h['quote_ko'] if l=='ko' else h['quote_en'])}”</blockquote><div class="stats"><span>{t['hpL']} <b>{h['hp']}</b></span><span>{t['combo']} <b>{h['combo']}</b></span></div></div></section>
<section class="sec"><div class="wrap two"><div><div class="sh"><h2>{e(t['story'])}</h2></div>{bio}</div><div><div class="sh"><h2>{e(t['skills'])}</h2></div><ul class="skills">{skills}</ul></div></div></section>{turn}
<nav class="pn wrap"><a href="/{l}/heroes/{prev['id']}/">← {e(prev['name'])}</a><a href="/{l}/heroes/">{e(t['roster'])}</a><a href="/{l}/heroes/{nxt['id']}/">{e(nxt['name'])} →</a></nav>'''
        extra='<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script>' if h['id']=='pixel' else ''
        out(f'/{l}/heroes/{h["id"]}/index.html',shell(l,f'{h["name"]} — LAST WAVE',h['tag_ko'] if l=='ko' else h['tag_en'],f'/{l}/heroes/{h["id"]}/',body,og=f'/assets/art/{h["id"]}_key_s.jpg' if h['art'] else None,extra_head=extra))

    # THREATS
    body=f'<section class="page"><div class="wrap"><span class="eyebrow">LAST WAVE</span><h1>{e(t["threats"])}</h1><p class="lead">{e(t["threatsLead"])}</p></div><img class="band" src="/assets/art/threats_wide.jpg" alt="" ><div class="wrap"><div class="tlist">{"".join(threat_card(l,x) for x in THREATS)}{"".join(threat_card(l,x,True) for x in BOSSES)}</div></div></section>'
    out(f'/{l}/threats/index.html',shell(l,f'{t["threats"]} — LAST WAVE',t['threatsLead'],f'/{l}/threats/',body,og='/assets/art/threats_wide_s.jpg'))

    # ARENAS
    rows=''.join(f'<li><span class="w">{t["waves"]} {w}</span><h3>{e(n)}<small>{e(k)}</small></h3><p>{e(sk if l=="ko" else se)}</p></li>' for n,k,w,sk,se in ARENAS)
    body=f'<section class="page"><div class="wrap"><span class="eyebrow">LAST WAVE</span><h1>{e(t["arenas"])}</h1><p class="lead">{e(t["arenasLead"])}</p><ol class="arenas">{rows}</ol></div></section>'
    out(f'/{l}/arenas/index.html',shell(l,f'{t["arenas"]} — LAST WAVE',t['arenasLead'],f'/{l}/arenas/',body))

    # NEWS
    items=''.join(f'<article><time>{n[0]}</time><h3>{e(n[1] if l=="ko" else n[3])}</h3><p>{e(n[2] if l=="ko" else n[4])}</p></article>' for n in NEWS)
    body=f'<section class="page"><div class="wrap"><span class="eyebrow">LAST WAVE</span><h1>{e(t["news"])}</h1><div class="ngrid list">{items}</div></div></section>'
    out(f'/{l}/news/index.html',shell(l,f'{t["news"]} — LAST WAVE','Dev notes',f'/{l}/news/',body))

    # BOARD (Supabase · 구글·애플 로그인). 설정은 /assets/board-config.js — 비어 있으면 「오픈 준비 중」
    bt='게시판' if l=='ko' else 'Community'
    bl='공지·패치노트 · 자유 · 팬아트·공략 · 버그·건의' if l=='ko' else 'News & patch notes · General · Fan art & guides · Bugs & ideas'
    body=f'<section class="page board-page"><div class="wrap"><span class="eyebrow">LAST WAVE</span><h1>{e(bt)}</h1><p class="lead">{e(bl)}</p><div id="board" data-lang="{l}"><p class="b-msg">…</p></div></div></section>'
    bh='<script src="/assets/board-config.js?v=2"></script><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script><script src="/assets/board.js?v=2" defer></script>'
    out(f'/{l}/board/index.html',shell(l,f'{bt} — LAST WAVE',bl,f'/{l}/board/',body,extra_head=bh))

out('/index.html','<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/ko/"><link rel="canonical" href="https://games.apholdings.kr/ko/"><script>location.replace((navigator.language||"").toLowerCase().startsWith("ko")?"/ko/":"/en/")</script></head><body></body></html>')
out('/404.html','<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/ko/"></head><body></body></html>')
out('/CNAME','games.apholdings.kr'); out('/.nojekyll','')
urls=[f'/{l}/{s}' for l in ('ko','en') for s in ['','heroes/','threats/','arenas/','news/','board/']+[f'heroes/{h["id"]}/' for h in HEROES]]
out('/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{ORIGIN}{u}</loc></url>' for u in urls)+'</urlset>')
out('/robots.txt',f'User-agent: *\nAllow: /\nSitemap: {ORIGIN}/sitemap.xml\n')
print('built',len(urls),'pages')
