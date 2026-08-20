# TLI Hero Rank 한국어 번역

[tliherorank.com](https://tliherorank.com/) (Torchlight Infinite 히어로 랭킹 사이트)의
게임 용어와 UI를 한국어로 번역하는 크롬 확장 프로그램입니다. 번역 사전은
[tlidb.com](https://tlidb.com/ko/)이 공개하는 다국어 데이터를 기준으로 자동 생성됩니다.

## 커뮤니티 / 문의

카카오톡 오픈채팅: https://open.kakao.com/o/gKyqLeJi

버그 제보나 개선 요청은 [GitHub Issues](https://github.com/listil/tliherorank-korean-extension/issues)도 이용해 주세요.

## 설치 (개발자 모드로 로드)

1. `chrome://extensions` 접속
2. 우측 상단 "개발자 모드" 켜기
3. "압축해제된 확장 프로그램을 로드" 클릭 → 이 폴더 선택
4. https://tliherorank.com/ 접속 후 새로고침

툴바 아이콘을 클릭하면 번역 켜기/끄기와 현재 사전 항목 수를 확인할 수 있습니다.
(토글 변경 사항은 페이지를 새로고침해야 반영됩니다.)

## 번역 사전 갱신하기

새 시즌에 히어로/스킬/아이템이 추가되면 tlidb.com의 사전 데이터도 함께 갱신되므로,
아래 명령을 다시 실행해 `data/dictionary.json`을 재생성하세요.

```
npm run build:dictionary
```

내부적으로 세 스크립트를 순서대로 실행합니다:

- `scripts/build-dictionary.mjs`: tlidb.com의 공개 i18n JSON(`/i18n/{lang}.json`,
  `/i18n/autocomplete_{lang}.json`)을 병합해 `data/dictionary.json`을 생성합니다.
- `scripts/build-hero-combos.mjs`: tlidb.com의 `/en/Hero`, `/ko/Hero` 페이지를
  실제로 렌더링(Playwright)해 "클래스명 히어로이름 | 특성명" 형태의 히어로 초상화
  툴팁 문구를 정확한 띄어쓰기로 `data/dictionary.json`에 덮어씁니다. (`i18n/en.json`은
  이 조합 문자열을 공백 없이 이어붙여 내보내서 실제 사이트 텍스트와 맞지 않는
  버그가 있어 별도로 보정합니다.)
- `scripts/build-trait-nodes.mjs`: 위 27개 히어로+특성 조합 각각의 tlidb.com 상세
  페이지(예: `/ko/Licorice_Note`)를 렌더링해서, 그 안에 있는 개별 재능 노드 이름
  ("Require lv N" 바로 위 줄)을 전부 뽑아 `data/dictionary.json`에 추가합니다. 이
  이름들은 tlidb의 공용 i18n/검색 데이터에는 없고 오직 이 상세 페이지 본문에만
  있습니다.
- `scripts/build-core-talents.mjs`: "핵심 재능(Core Talent Node)" 163개는
  `autocomplete_{lang}.json`에서 전부 같은 `value:"Talent"` 플레이스홀더를 공유해
  en/ko 배열 순서로는 안전하게 짝지을 수 없습니다 (`mergeDictionary.mjs`가 이런
  모호한 그룹은 자동으로 건너뜁니다 — 아래 "알려진 버그 수정" 참고). 대신
  `tlidb.com/{en,ko}/Talent` 페이지의 "Core Talent Node" 탭을 렌더링해서, 이미
  검증된 32개 직업명을 기준점으로 삼아("직업명 줄 바로 위 줄 = 노드 이름") 순서가
  실제로 일치하는 이 페이지에서 다시 짝을 맞춥니다.

`data/dictionary.json`은 자동 생성 파일이므로 직접 수정하지 말고 위 명령을
다시 실행하세요.
- `data/ui-strings.json`: tliherorank.com 자체의 메뉴/필터/버튼/직업(재능판) 문구를
  손으로 번역한 사전입니다. 사이트에서 아직 번역되지 않은 문구를 발견하면 이 파일에
  `"영문 원문": "한국어 번역"` 형태로 추가하면 됩니다.
- `data/hero-names.json`: 히어로 이름(예: `Rehan`, `Sage`)만 따로 모은 사전입니다.
  플레이어 닉네임이 우연히 히어로 이름과 같을 수 있어(예: 닉네임이 "Sage") 이 파일은
  일반 사전에 합치지 않고, `content.js`에서 오직 "히어로이름 숫자" 형태(예:
  `Rehan 2` → `리한2`)일 때만 사용합니다.

## 동작 방식

- 페이지의 모든 텍스트 노드와 `placeholder`/`aria-label`/`title` 속성을 순회하면서,
  내용이 사전의 영문 키와 **정확히 일치**할 때만 한국어로 치환합니다. (부분 문자열
  치환은 하지 않습니다 — 플레이어 닉네임 등 임의 텍스트를 실수로 바꾸지 않기 위함)
- 사이트가 SPA라 테이블/필터가 동적으로 다시 렌더링되므로 `MutationObserver`로
  DOM 변경을 감지해 새로 추가된 내용도 번역합니다.
- 마우스오버 툴팁(`title`/`aria-label` 속성)도 정적 사전으로 우선 번역되고(이름 줄,
  `Tags:`/`Limited to:`/`Source:` 줄 등), 스킬·팩트스피릿처럼 여러 줄짜리 카드형
  툴팁은 **실제로 마우스를 올리는 순간** tlidb.com에서 해당 페이지를 실시간으로
  가져와 완전한 문장으로 다시 채웁니다 (아래 "실시간 tlidb 조회" 참고). 정적 사전
  번역은 실시간 조회가 끝나기 전까지 잠깐 보여주는 역할이자, 조회가 실패했을 때의
  대체 표시로도 쓰입니다.

## 실시간 tlidb 조회 (마우스오버 툴팁)

tlidb.com의 스킬/팩트스피릿 상세 페이지(예: `tlidb.com/ko/Split_Shot`)는 언어별로
**서버에서 이미 렌더링되어** 내려옵니다. 그리고 그 페이지에 적힌 대미지 %, 투사체
개수 같은 수치는 스킬 레벨에 따른 고정값이라, tliherorank.com이 툴팁에 표시하는
값과 그대로 일치합니다. 그래서 정적 사전보다 훨씬 정확한 완전한 문장을 가져올 수
있습니다.

동작 방식:
1. 정적 번역 단계에서 툴팁의 영문 원본 이름(예: `Split Shot`)을 `data-tli-live-name`
   속성에 잠깐 저장해 둡니다.
2. 그 요소에 실제로 마우스를 올리면(`content.js`의 위임 이벤트 리스너), 이름을
   `Split_Shot`처럼 슬러그로 바꿔 `https://tlidb.com/ko/{슬러그}` 요청을 보냅니다.
3. 콘텐츠 스크립트가 직접 fetch하면 tliherorank.com 페이지의 CORS 정책에 막히기
   때문에, 실제 요청은 `src/background.js`(백그라운드 서비스 워커, 확장 프로그램
   전용 컨텍스트라 페이지 CORS의 영향을 받지 않음)가 대신 보내고 결과를 메시지로
   돌려줍니다.
4. 받아온 HTML을 `DOMParser`로 파싱해 이름/태그/제한 조건/설명 문장을 추출하고,
   툴팁의 `title`(및 `aria-label`)을 이 내용으로 다시 씁니다.
5. 같은 이름은 페이지를 새로고침하기 전까지 메모리에 캐시되어, 같은 항목을 다시
   호버해도 재요청하지 않습니다.

tlidb.com의 카드 HTML 구조는 항목 종류마다 달라서(`src/content.js`의
`CARD_PARSERS`), 현재 스킬 카드, 팩트스피릿 카드, 핵심 재능 노드 카드(`.card >
.card-header` + `.card-body`) 세 템플릿을 지원합니다. 아직 지원하지 않는 종류를
호버하면 tlidb 페이지가 없거나 구조가 달라 조용히 실패하고, 기존 정적 번역이
그대로 유지됩니다 — 오류로 표시되진 않지만 완전한 문장까지는 못 가져옵니다. 새
카드 템플릿을 발견하면 `CARD_PARSERS`에 파서를 하나 추가하면 됩니다.

핵심 재능 필터 버튼의 툴팁은 스킬/팩트스피릿과 구조가 달라서
(`"Include 이름\n\n이름\nCore Talent: 직업\n설명..."`) 별도로 처리합니다:
- `"Include X"` 줄은 `X`가 히어로+숫자("Sage 1")면 `heroNameMap`으로, 그 외
  일반 단어(재능 이름 등)면 사전 전체에서 찾아 `"번역 포함"` 형태로 바꿉니다.
- `"Core Talent: X"` / `"Hero Trait: X"` 줄은 라벨과 값을 각각 번역합니다.
- 실시간 조회용 영문 이름은 보통 툴팁 첫 줄이지만, 이 구조에서는 `"Core
  Talent:"` 줄 바로 위 줄이 진짜 이름이라 `extractLiveName()`이 그 앵커를 먼저
  찾고, 없으면 첫 줄로 대체합니다.

## 알려진 버그와 수정 내역

- **핵심 재능 오역 (수정됨)**: `autocomplete_{lang}.json`에서 "Core Talent Node"
  163개가 전부 `value:"Talent"`라는 동일한 값을 공유하는데, en/ko 배열에서 같은
  `value`를 가진 항목들의 등장 순서가 서로 다릅니다 (예: en 배열의 29번째
  `Talent` 항목은 "Gale"이지만 ko 배열의 29번째는 "예민"으로 서로 무관한
  항목이었습니다). 예전 버전은 이걸 순서대로 그냥 짝지어서 `Gale`이 `예민`으로
  잘못 번역되는 등의 오역이 있었습니다. 지금은 `mergeDictionary.mjs`가 이렇게
  값이 겹치는 그룹을 자동으로 걸러내 애초에 잘못된 항목을 만들지 않고,
  `scripts/build-core-talents.mjs`가 순서가 실제로 검증된 별도 페이지에서 다시
  안전하게 채워 넣습니다.

## 알려진 한계

- 위 실시간 조회가 실패하는 항목(다른 카드 템플릿을 쓰는 일부 아이템 등)은 정적
  사전 번역 수준(이름 등 일부만 번역)에 머무릅니다.
- 정적 사전 자체에도 없는 항목(플레이어 사이 소소한 표기 차이 등)은 tlidb.com에
  나중에 데이터가 추가되면 `npm run build:dictionary`로 자동으로 채워집니다.

## 번역 결과 자동 확인 (Playwright)

실제 tliherorank.com에 확장 프로그램을 로드한 채로 접속해 번역이 적용되는지
자동으로 확인할 수 있습니다 (최초 1회 `npm install` 및 브라우저 다운로드 필요).

```
npm install
npx playwright install chromium
npm run verify
```

브라우저 창이 뜨고, 페이지의 한글 글자 수와 본문 일부, 스크린샷
(`scripts/verify-screenshot.png`, git에는 포함되지 않음)을 출력합니다. 사전을
수정한 뒤 이 명령으로 실제 반영 여부를 빠르게 확인하세요.

## 아이콘

`icons/*.png`는 `scripts/build-icons.mjs`로 생성한 단순 placeholder 아이콘입니다.
필요하면 직접 교체하거나 `node scripts/build-icons.mjs`로 다시 생성하세요.
