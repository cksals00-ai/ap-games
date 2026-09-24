/* AP Games 게시판 — 정적 페이지 + Supabase (구글·애플 로그인)
   라우팅: ?c=<category>  목록 · ?p=<id> 글 · ?w=<category> 쓰기 · ?e=<id> 수정 · ?me 닉네임
   글 본문은 textContent 로만 넣는다(HTML 주입 없음). */
(function () {
  var root = document.getElementById('board'); if (!root) return;
  var L = root.dataset.lang === 'en' ? 'en' : 'ko';
  var cfg = window.BOARD_CFG || {};
  var S = {
    ko: { cats: { notice: '공지·패치노트', free: '자유', fanart: '팬아트·공략', bug: '버그·건의' },
      all: '전체', write: '글쓰기', login: '로그인', logout: '로그아웃', google: '구글로 계속', apple: 'Apple로 계속',
      loginNeed: '글을 쓰려면 로그인하세요.', title: '제목', body: '내용', images: '이미지 (최대 4장, 장당 5MB)', submit: '올리기', save: '저장',
      cancel: '취소', del: '삭제', edit: '수정', report: '신고', reported: '신고했습니다. 운영자가 확인합니다.', comment: '댓글', commentPh: '댓글을 남기세요',
      like: '추천', empty: '아직 글이 없습니다. 첫 글을 남겨 보세요.', more: '더 보기', nick: '닉네임', nickPh: '2~16자',
      nickNeed: '처음이시네요. 게시판에서 쓸 닉네임을 정해 주세요.', nickTaken: '이미 쓰는 닉네임이에요.', banned: '이용이 제한된 계정입니다.',
      noticeOnly: '공지는 운영자만 쓸 수 있습니다.', back: '목록', confirmDel: '정말 삭제할까요?', notReady: '게시판 오픈 준비 중입니다. 곧 열려요.',
      status: { open: '접수', checking: '확인 중', fixed: '수정됨', wontfix: '보류' }, pin: '고정', unpin: '고정 해제', hide: '숨김', unhide: '숨김 해제',
      admin: '운영자', ago: function (m) { return m < 1 ? '방금' : m < 60 ? m + '분 전' : m < 1440 ? Math.floor(m / 60) + '시간 전' : Math.floor(m / 1440) + '일 전'; },
      rules: '욕설·비방·도배·개인정보·저작권 침해 글은 예고 없이 숨겨지고, 반복하면 이용이 제한됩니다.' },
    en: { cats: { notice: 'News & patch notes', free: 'General', fanart: 'Fan art & guides', bug: 'Bugs & ideas' },
      all: 'All', write: 'New post', login: 'Sign in', logout: 'Sign out', google: 'Continue with Google', apple: 'Continue with Apple',
      loginNeed: 'Sign in to post.', title: 'Title', body: 'Body', images: 'Images (up to 4, 5 MB each)', submit: 'Post', save: 'Save',
      cancel: 'Cancel', del: 'Delete', edit: 'Edit', report: 'Report', reported: 'Reported. A moderator will review it.', comment: 'Comments', commentPh: 'Write a comment',
      like: 'Like', empty: 'No posts yet. Be the first.', more: 'Load more', nick: 'Nickname', nickPh: '2–16 characters',
      nickNeed: 'Welcome. Pick a nickname for the board.', nickTaken: 'That nickname is taken.', banned: 'This account is restricted.',
      noticeOnly: 'Only moderators can post news.', back: 'Back to list', confirmDel: 'Delete this?', notReady: 'The board opens soon.',
      status: { open: 'Open', checking: 'Checking', fixed: 'Fixed', wontfix: 'On hold' }, pin: 'Pin', unpin: 'Unpin', hide: 'Hide', unhide: 'Unhide',
      admin: 'Mod', ago: function (m) { return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.floor(m / 60) + 'h ago' : Math.floor(m / 1440) + 'd ago'; },
      rules: 'Abuse, harassment, spam, personal data or copyright violations are hidden without notice; repeat offenders are restricted.' }
  }[L];
  var CATS = ['notice', 'free', 'fanart', 'bug'], PAGE = 20;
  var PROV = cfg.providers || ['google', 'apple'];

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) {
      var v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'text') el.textContent = v; else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function q() { return new URLSearchParams(location.search); }
  function go(params) { history.pushState(null, '', '?' + new URLSearchParams(params).toString()); route(); }
  function ago(t) { return S.ago(Math.floor((Date.now() - new Date(t)) / 60000)); }
  function clear() { root.innerHTML = ''; }
  function msg(t, cls) { return h('p', { class: 'b-msg ' + (cls || ''), text: t }); }

  if (!cfg.url || !cfg.anon || !window.supabase) { clear(); root.appendChild(msg(S.notReady)); return; }
  var sb = window.supabase.createClient(cfg.url, cfg.anon, { db: { schema: 'board' }, auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  var me = null, prof = null;

  async function loadMe() {
    var r = await sb.auth.getUser(); me = r.data.user || null; prof = null;
    if (me) {
      var p = await sb.from('profiles').select('*').eq('id', me.id).maybeSingle(); prof = p.data;
      if (!prof && !p.error) { await sb.from('profiles').insert({ id: me.id }); p = await sb.from('profiles').select('*').eq('id', me.id).maybeSingle(); prof = p.data; }
    }
  }
  function login(provider) {
    sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: location.origin + location.pathname + location.search } });
  }
  function authBar() {
    var bar = h('div', { class: 'b-auth' });
    if (!me) {
      bar.appendChild(h('button', { class: 'b-btn ghost', onclick: function () { loginBox(); } , text: S.login }));
    } else {
      bar.appendChild(h('span', { class: 'b-me', text: (prof && prof.nickname) || me.email || '' }));
      if (prof && prof.is_admin) bar.appendChild(h('span', { class: 'b-tag admin', text: S.admin }));
      bar.appendChild(h('button', { class: 'b-btn ghost', text: S.logout, onclick: async function () { await sb.auth.signOut(); await loadMe(); route(); } }));
    }
    return bar;
  }
  function loginBox() {
    var box = h('div', { class: 'b-modal', onclick: function (e) { if (e.target === box) box.remove(); } }, [
      h('div', { class: 'b-card' }, [
        h('h3', { text: S.login }), msg(S.loginNeed),
        PROV.indexOf('google') >= 0 ? h('button', { class: 'b-btn google', text: S.google, onclick: function () { login('google'); } }) : null,
        PROV.indexOf('apple') >= 0 ? h('button', { class: 'b-btn apple', text: S.apple, onclick: function () { login('apple'); } }) : null,
        h('button', { class: 'b-btn ghost', text: S.cancel, onclick: function () { box.remove(); } })
      ])
    ]);
    document.body.appendChild(box);
  }
  function needWrite() {
    if (!me) { loginBox(); return false; }
    if (prof && prof.banned) { alert(S.banned); return false; }
    if (!prof || !prof.nickname) { go({ me: 1 }); return false; }
    return true;
  }
  function tabs(active) {
    var t = h('nav', { class: 'b-tabs' });
    t.appendChild(h('a', { href: '?', class: !active ? 'on' : null, text: S.all, onclick: function (e) { e.preventDefault(); go({}); } }));
    CATS.forEach(function (c) { t.appendChild(h('a', { href: '?c=' + c, class: active === c ? 'on' : null, text: S.cats[c], onclick: function (e) { e.preventDefault(); go({ c: c }); } })); });
    return t;
  }
  function head(active) {
    var top = h('div', { class: 'b-top' }, [tabs(active), authBar()]);
    return top;
  }
  function author(p) { return (p.profiles && p.profiles.nickname) || '—'; }

  async function list(cat, page) {
    clear(); root.appendChild(head(cat));
    var actions = h('div', { class: 'b-actions' });
    if (cat !== 'notice' || (prof && prof.is_admin)) actions.appendChild(h('button', { class: 'b-btn', text: S.write, onclick: function () { if (needWrite()) go({ w: cat || 'free' }); } }));
    root.appendChild(actions);
    var qy = sb.from('posts').select('id,category,title,images,status,pinned,hidden,comment_count,like_count,created_at,profiles!posts_author_fkey(nickname,is_admin)')
      .eq('game', 'lastwave').order('pinned', { ascending: false }).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (cat) qy = qy.eq('category', cat);
    var r = await qy;
    if (r.error) { root.appendChild(msg(r.error.message, 'err')); return; }
    if (!r.data.length && !page) { root.appendChild(msg(S.empty)); }
    var ul = h('ul', { class: 'b-list' + (cat === 'fanart' ? ' grid' : '') });
    r.data.forEach(function (p) {
      var thumb = p.images && p.images[0] ? h('img', { src: p.images[0], alt: '', loading: 'lazy' }) : null;
      var st = p.category === 'bug' && p.status ? h('span', { class: 'b-tag st-' + p.status, text: S.status[p.status] }) : null;
      ul.appendChild(h('li', { class: (p.pinned ? 'pinned ' : '') + (p.hidden ? 'hidden' : '') }, [
        h('a', { href: '?p=' + p.id, onclick: function (e) { e.preventDefault(); go({ p: p.id }); } }, [
          thumb,
          h('div', { class: 'b-row' }, [
            h('span', { class: 'b-cat', text: S.cats[p.category] }), st,
            h('b', { class: 'b-title', text: p.title }),
            p.comment_count ? h('span', { class: 'b-cc', text: '[' + p.comment_count + ']' }) : null
          ]),
          h('div', { class: 'b-meta' }, [author(p) + ' · ' + ago(p.created_at) + (p.like_count ? ' · ♥ ' + p.like_count : '')])
        ])
      ]));
    });
    root.appendChild(ul);
    if (r.data.length === PAGE) root.appendChild(h('button', { class: 'b-btn ghost more', text: S.more, onclick: function () { go(Object.assign(cat ? { c: cat } : {}, { pg: page + 1 })); } }));
    root.appendChild(msg(S.rules, 'rules'));
  }

  async function view(id) {
    clear(); root.appendChild(head(null));
    var r = await sb.from('posts').select('*,profiles!posts_author_fkey(nickname,is_admin)').eq('id', id).maybeSingle();
    if (!r.data) { root.appendChild(msg('404')); return; }
    var p = r.data, mine = me && p.author === me.id, admin = prof && prof.is_admin;
    var art = h('article', { class: 'b-post' }, [
      h('a', { class: 'b-back', href: '?c=' + p.category, text: '← ' + S.back + ' · ' + S.cats[p.category], onclick: function (e) { e.preventDefault(); go({ c: p.category }); } }),
      h('h1', { class: 'b-h', text: p.title }),
      h('div', { class: 'b-meta' }, [
        (p.profiles && p.profiles.is_admin) ? h('span', { class: 'b-tag admin', text: S.admin }) : null,
        author(p) + ' · ' + ago(p.created_at),
        p.category === 'bug' && p.status ? h('span', { class: 'b-tag st-' + p.status, text: S.status[p.status] }) : null
      ]),
      h('div', { class: 'b-body', text: p.body })
    ]);
    (p.images || []).forEach(function (src) { art.appendChild(h('a', { href: src, target: '_blank', rel: 'noopener' }, [h('img', { class: 'b-img', src: src, alt: '', loading: 'lazy' })])); });
    var tools = h('div', { class: 'b-tools' });
    var liked = false;
    if (me) { var lk = await sb.from('likes').select('post_id').eq('post_id', id).eq('user_id', me.id).maybeSingle(); liked = !!lk.data; }
    tools.appendChild(h('button', { class: 'b-btn ' + (liked ? '' : 'ghost'), text: '♥ ' + S.like + ' ' + (p.like_count || 0), onclick: async function () {
      if (!needWrite()) return;
      if (liked) await sb.from('likes').delete().eq('post_id', id).eq('user_id', me.id); else await sb.from('likes').insert({ post_id: id });
      view(id);
    } }));
    if (mine) tools.appendChild(h('button', { class: 'b-btn ghost', text: S.edit, onclick: function () { go({ e: id }); } }));
    if (mine || admin) tools.appendChild(h('button', { class: 'b-btn ghost', text: S.del, onclick: async function () { if (!confirm(S.confirmDel)) return; await sb.from('posts').delete().eq('id', id); go({ c: p.category }); } }));
    if (me && !mine) tools.appendChild(h('button', { class: 'b-btn ghost', text: S.report, onclick: async function () { await sb.from('reports').insert({ post_id: id }); alert(S.reported); } }));
    if (admin) {
      tools.appendChild(h('button', { class: 'b-btn ghost', text: p.pinned ? S.unpin : S.pin, onclick: async function () { await sb.from('posts').update({ pinned: !p.pinned }).eq('id', id); view(id); } }));
      tools.appendChild(h('button', { class: 'b-btn ghost', text: p.hidden ? S.unhide : S.hide, onclick: async function () { await sb.from('posts').update({ hidden: !p.hidden }).eq('id', id); view(id); } }));
      if (p.category === 'bug') {
        var sel = h('select', { class: 'b-sel', onchange: async function () { await sb.from('posts').update({ status: sel.value }).eq('id', id); view(id); } });
        Object.keys(S.status).forEach(function (k) { sel.appendChild(h('option', { value: k, selected: p.status === k, text: S.status[k] })); });
        tools.appendChild(sel);
      }
    }
    art.appendChild(tools);
    root.appendChild(art);
    // comments
    var cs = await sb.from('comments').select('*,profiles!comments_author_fkey(nickname,is_admin)').eq('post_id', id).order('created_at');
    var box = h('section', { class: 'b-comments' }, [h('h3', { text: S.comment + ' ' + ((cs.data || []).length) })]);
    (cs.data || []).forEach(function (c) {
      var cm = me && c.author === me.id;
      box.appendChild(h('div', { class: 'b-c' + (c.hidden ? ' hidden' : '') }, [
        h('div', { class: 'b-meta' }, [(c.profiles && c.profiles.is_admin) ? h('span', { class: 'b-tag admin', text: S.admin }) : null, ((c.profiles && c.profiles.nickname) || '—') + ' · ' + ago(c.created_at)]),
        h('p', { text: c.body }),
        (cm || admin) ? h('button', { class: 'b-link', text: S.del, onclick: async function () { if (!confirm(S.confirmDel)) return; await sb.from('comments').delete().eq('id', c.id); view(id); } }) : null,
        (me && !cm) ? h('button', { class: 'b-link', text: S.report, onclick: async function () { await sb.from('reports').insert({ comment_id: c.id }); alert(S.reported); } }) : null
      ]));
    });
    var ta = h('textarea', { class: 'b-in', rows: 3, maxlength: 2000, placeholder: S.commentPh });
    box.appendChild(h('form', { class: 'b-cform', onsubmit: async function (e) {
      e.preventDefault(); if (!needWrite()) return; var v = ta.value.trim(); if (!v) return;
      var ins = await sb.from('comments').insert({ post_id: id, body: v }); if (ins.error) { alert(ins.error.message); return; } view(id);
    } }, [ta, h('button', { class: 'b-btn', type: 'submit', text: S.submit })]));
    root.appendChild(box);
  }

  async function write(cat, editId) {
    if (!needWrite()) return;
    var p = null;
    if (editId) { var r = await sb.from('posts').select('*').eq('id', editId).maybeSingle(); p = r.data; if (!p || p.author !== me.id) { go({}); return; } cat = p.category; }
    if (cat === 'notice' && !(prof && prof.is_admin)) { alert(S.noticeOnly); go({ c: 'notice' }); return; }
    clear(); root.appendChild(head(cat));
    var sel = h('select', { class: 'b-sel', disabled: !!p });
    CATS.forEach(function (c) { if (c === 'notice' && !(prof && prof.is_admin)) return; sel.appendChild(h('option', { value: c, selected: c === cat, text: S.cats[c] })); });
    var ti = h('input', { class: 'b-in', maxlength: 80, placeholder: S.title, value: p ? p.title : '' });
    var bd = h('textarea', { class: 'b-in', rows: 12, maxlength: 8000, placeholder: S.body }); bd.value = p ? p.body : '';
    var fi = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true });
    var info = msg('');
    var form = h('form', { class: 'b-form', onsubmit: async function (e) {
      e.preventDefault(); info.textContent = '…';
      var imgs = p ? (p.images || []) : [];
      var files = [].slice.call(fi.files || [], 0, 4 - imgs.length);
      for (var i = 0; i < files.length; i++) {
        var f = files[i]; if (f.size > 5242880) continue;
        var path = me.id + '/' + Date.now() + '_' + i + '.' + (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
        var up = await sb.storage.from('apgames-board').upload(path, f, { contentType: f.type, upsert: false });
        if (!up.error) imgs.push(sb.storage.from('apgames-board').getPublicUrl(path).data.publicUrl);
      }
      var row = { title: ti.value.trim(), body: bd.value.trim(), images: imgs };
      var res = p ? await sb.from('posts').update(row).eq('id', p.id).select('id').single()
                  : await sb.from('posts').insert(Object.assign(row, { category: sel.value, game: 'lastwave' })).select('id').single();
      if (res.error) { info.textContent = res.error.message; return; }
      go({ p: res.data.id });
    } }, [sel, ti, bd, h('label', { class: 'b-file' }, [S.images, fi]), info,
      h('div', { class: 'b-actions' }, [h('button', { class: 'b-btn', type: 'submit', text: p ? S.save : S.submit }), h('button', { class: 'b-btn ghost', type: 'button', text: S.cancel, onclick: function () { history.back(); } })])]);
    root.appendChild(form);
    root.appendChild(msg(S.rules, 'rules'));
  }

  async function nickname() {
    if (!me) { loginBox(); return; }
    clear(); root.appendChild(head(null));
    var inp = h('input', { class: 'b-in', maxlength: 16, placeholder: S.nickPh, value: (prof && prof.nickname) || '' });
    var info = msg(S.nickNeed);
    root.appendChild(h('form', { class: 'b-form narrow', onsubmit: async function (e) {
      e.preventDefault(); var v = inp.value.trim(); if (v.length < 2) return;
      var r = await sb.from('profiles').update({ nickname: v }).eq('id', me.id);
      if (r.error) { info.textContent = /duplicate|unique/i.test(r.error.message) ? S.nickTaken : r.error.message; return; }
      await loadMe(); go({});
    } }, [h('h3', { text: S.nick }), info, inp, h('button', { class: 'b-btn', type: 'submit', text: S.save })]));
  }

  async function route() {
    var s = q();
    if (s.has('p')) return view(+s.get('p'));
    if (s.has('w')) return write(s.get('w'), null);
    if (s.has('e')) return write(null, +s.get('e'));
    if (s.has('me')) return nickname();
    var c = s.get('c'); return list(CATS.indexOf(c) >= 0 ? c : null, +(s.get('pg') || 0));
  }
  window.addEventListener('popstate', route);
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') loadMe().then(function () { if (me && prof && !prof.nickname) go({ me: 1 }); else route(); }); });
  loadMe().then(route);
})();
