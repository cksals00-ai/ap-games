"""Public concept reference for PIXEL forms. Static, bilingual, no account state."""
import html
import json
from pathlib import Path

FORMS = json.loads(Path(__file__).with_name('forms.json').read_text(encoding='utf-8'))
escape = html.escape


def forms_teaser(lang):
    ko = lang == 'ko'
    return f'''<section class="sec forms-teaser"><div class="wrap">
<span class="eyebrow">PIXEL / SEVEN FORMS</span>
<h2>{'하나의 픽셀. 일곱 가지 힘.' if ko else 'One PIXEL. Seven forms.'}</h2>
<p class="lead">{'블루 · 네이처 · 다크 · 헬 · 볼트 · 라이트 · 네버. 일반에서 히든까지, 형태마다 달라지는 전투.' if ko else 'Blue, Nature, Dark, Hell, Volt, Light and Never. From Common to Hidden, each form changes the fight.'}</p>
<a class="btn" href="/{lang}/forms/">{'형태와 능력 보기' if ko else 'Explore forms & abilities'} →</a>
</div></section>'''


def forms_body(lang):
    ko = lang == 'ko'
    suffix = 'ko' if ko else 'en'
    cards = []
    for form in FORMS['forms']:
        rows = ''.join(f'<div><dt>{escape(skill["name_" + suffix])}</dt><dd>{escape(skill["value"]) or "—"}</dd></div>' for skill in form['skills'])
        cards.append(f'''<article class="form-card" id="{form['id']}" style="--form-color:{form['color']}">
<span class="form-rarity">{escape(form['rarity_' + suffix])}</span><h2>{escape(form['name_' + suffix])}<small>{escape(form['name_en'].upper())}</small></h2><dl>{rows}</dl></article>''')
    links = ''.join(f'<a href="#{f["id"]}">{escape(f["name_" + suffix])}</a>' for f in FORMS['forms'])
    pairs = [('PIXEL', 'NEVER · 300 HP'), ('ALFRED', 'EMBER · 300 HP'), ('LINE', 'EDGE · 350 HP'), ('BLUE NEWBIE', 'VITA · 300 HP'), ('IRIS', 'RIFT · 280 HP'), ('ROOKIE', 'PULSE · 320 HP')]
    bonds = ''.join(f'<li><span>{hero}</span><b>{veil}</b></li>' for hero, veil in pairs)
    return f'''<section class="page forms-page"><div class="wrap">
<span class="eyebrow">LAST WAVE / PIXEL</span>
<h1>{'일곱 가지<br>전투의 형태.' if ko else 'Seven forms.<br>One survivor.'}</h1>
<p class="lead">{'푸른 불꽃에서 무형의 힘까지. 형태의 등급과 능력을 확인하세요.' if ko else 'From blue flame to formless power. Discover each form’s rarity and abilities.'}</p>
<p class="note">{'제작자 설정에 따른 일곱 형태의 수치입니다. 현재 개발판은 형태별 능력을 반영하며, 베일 3D 결합은 VITA·NEVER 두 종류가 통합되어 있습니다.' if ko else 'Seven form profiles follow the creator’s settings. The current preview implements their abilities; integrated 3D Veil bonding covers VITA and NEVER.'}</p>
<nav class="form-index" aria-label="{'형태 바로가기' if ko else 'Jump to a form'}">{links}</nav>
<div class="form-grid">{''.join(cards)}</div>
<p class="note">{'표의 수치는 피해량, 회복량, 보호막 또는 표기된 비율입니다. 수치가 없는 기술은 이름으로 표시합니다.' if ko else 'Values indicate damage, healing, shield strength or the stated percentage. A dash means no numerical value is specified.'}</p>
</div></section>
<section class="sec veil-section" id="veil"><div class="wrap veil-grid">
<figure><img src="/assets/art/never_veil.png" alt="{'푸른 빛이 흐르는 검은 유동형 존재 네버의 콘셉트 아트' if ko else 'Never concept art: a flowing black form threaded with blue light'}" loading="lazy" width="1024" height="1024"><figcaption>NEVER / VEIL · {'콘셉트 아트' if ko else 'Concept art'}</figcaption></figure>
<div><span class="eyebrow">NEVER / VEIL</span><h2>{'존재한다.<br>그리고 변한다.' if ko else 'Exist.<br>And become.'}</h2>
<p class="lead">{'이름은 네버. 종족은 베일. 픽셀과 결합하며, 무형의 힘으로 전투의 모습을 바꾼다.' if ko else 'The name is Never. The species is Veil. Bonded with PIXEL, formless power changes the shape of combat.'}</p>
<p class="transform-key"><kbd>Z</kbd><span>{'베일 변신 · Mac 조작' if ko else 'Veil transformation · Mac control'}</span></p>
<p class="note">{'iPhone 버전도 함께 개발 중입니다.' if ko else 'An iPhone version is also in development.'}</p>
<ul class="veil-bonds" aria-label="{'공개된 결합 관계' if ko else 'Revealed bonds'}">{bonds}</ul>
<p class="note">{'표는 결합 후 HP. VITA·NEVER는 통합, EMBER·EDGE·RIFT·PULSE는 기획 단계다. ROOKIE는 향후 캐릭터이며 현재 선택 영웅은 다섯 명이다.' if ko else 'HP values are after bonding. VITA and NEVER are integrated; EMBER, EDGE, RIFT and PULSE remain concepts. ROOKIE is a future character; five heroes are currently selectable.'}</p>
<p class="note">{'VITA: 연속 공격 25/30/60 · Q 100 · E 120 · C 보호막 150 · X 1,500 + 회복/소생.' if ko else 'VITA: combo 25/30/60 · Q 100 · E 120 · C shield 150 · X 1,500 + heal/revive.'}</p>
</div></div></section>
<section class="sec"><div class="wrap"><span class="eyebrow">ULTIMATE / BLUE PILLAR</span><h2>{'푸른 기둥' if ko else 'Blue Pillar'}</h2>
<p class="lead">{'거대한 푸른 에너지 기둥. 일반 적을 쓰러뜨리고 보스에게 2,500 피해를 입힌다.' if ko else 'A vast pillar of blue energy. Destroys ordinary enemies and deals 2,500 damage to bosses.'}</p>
<figure class="pillar-concept"><img src="/assets/art/pixel_blue_pillar_concept.png" alt="{'픽셀의 푸른 기둥 궁극기 연출 콘셉트' if ko else 'Concept art for PIXEL’s Blue Pillar ultimate'}" loading="lazy" width="1536" height="1024"><figcaption>{'궁극기 연출 콘셉트 · 실제 플레이 화면이 아닙니다.' if ko else 'Ultimate visual concept · not a gameplay screenshot.'}</figcaption></figure>
</div></section>'''
