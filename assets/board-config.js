/* 게시판 연결 설정 — 퀴즈아레나 Supabase 프로젝트의 board 스키마.
   공개(publishable) 키만 둡니다. secret / service_role 키는 절대 넣지 않습니다.
   providers: 켜진 로그인만 버튼으로 보입니다. 애플 설정이 끝나면 'apple' 추가. */
window.BOARD_CFG = {
  url: 'https://cxwdrlrqhxpnpepzrths.supabase.co',
  anon: 'sb_publishable_kqN8H7X5M8vt82mrmFWcVA_vg3EQBqR',
  providers: ['google']
};
