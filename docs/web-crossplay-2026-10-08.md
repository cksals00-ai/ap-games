# AP Games web and app crossplay beta — 2026-10-08

## Implemented
- Approved games-home-v2 HTML layout: dark two-column hero, four game cards, three-step guide, mobile stacking and approved local logos. Live at https://games.apholdings.kr/ko/.
- Web live 1v1 entry alongside unranked practice. Google/Kakao/Apple sign-in stays shared with AP Games. Points remain game-specific.
- Dedicated updated iOS entry: lobby network button → native CrossplayDuelView. Uses the same verified gateway, queue and match identifiers as the web. The store-installed older app does not have this entry.
- Exactly two registered players, no bot fill. Separate closed rooms protect interoperability from legacy peer-scored clients.
- Server row lock determines buzzer owner. Owner alone receives choices; answer key appears during reveal. Wrong answer/timeout locks that player out and reopens the other player's opportunity.
- Server records determine scores; submitted client scores, records, RP, standings and reward claims are ignored.
- Native scoring, traits, RP, tier-reward and pass policy modules copied from deployed native function v15. Web gateway reuses those pure policies.
- RP, game gold, XP, tier reward, mastery, answers, final result and receipt commit in one database transaction. Durable receipt replay awards nothing twice. Settlement leases recover after30s.
- Monotonic state versions reject delayed responses; room heartbeat/start retries and saved-room reconnect supported.

## Deployment
Supabase project cxwdrlrqhxpnpepzrths: games-web-gateway v4; native start-match and settle-match v16 add a server signature gate only for crossplay rooms. Legacy app rooms retain their existing native flow.
Migrations in supabase/migrations document service-only authority tables/RPCs. RLS is enabled, with direct anon/authenticated table access revoked. Auth UID is obtained from verified Auth user lookup.

## Verified
- Unit checks: gateway authentication/caller/CORS; private-room native bypass gate; schedule and answer-key redaction; forged scores/answers/RP ignored; receipt replay.
- Live transactional database fixtures: two callers share one queue; first claim wins; nonowner answer rejected; wrong lockout and opponent reopen; timeout rejects late answer; future question claim rejected; lease exclusive and expired lease reclaimed.
- Injected invalid question FK after reward/RP updates proved the entire award transaction rolls back. Valid settlement + replay awarded once. All fixtures were rolled back; no player results or rewards retained.
- Two local browser fixture clients: matching, owner-only choice buttons, wrong answer→other player buzzer→correct reveal, score/rank update, match completion.
- iOS Debug simulator build succeeded. This is a build verification, not a store upload.
- Live home checked on desktop; local home checked at390px with no horizontal overflow. Screenshot outputs/apgames-web/home-v2-live.png.

## Outstanding verification / release
Actual authenticated two-account iOS↔web end-to-end match remains pending human login. iOS crossplay source has not been uploaded to App Store Connect or released. Android crossplay client is not included in this change. No claim of compatibility with older store versions.
