# Chrome Web Store 등록용 텍스트

개발자 대시보드(https://chrome.google.com/webstore/devconsole)에 그대로 복사해
넣을 수 있도록 정리한 내용입니다.

## 기본 정보

- **이름**: 토치라이트 인피니트 한국 유저 도구 (기존 "TLI Hero Rank 한국어 번역"에서 변경)
- **버전**: manifest.json 기준 자동 반영 (현재 1.1.0)
- **카테고리**: Entertainment / Fun (없으면 Tools)
- **언어**: 한국어

## 1.1.0 업데이트 소개 (What's new)

대시보드의 "새 버전 안내"란이나 GitHub 릴리스 노트에 그대로 쓸 수 있는 문구입니다.

```
🎮 토치라이트 인피니트 한국 유저 도구로 이름이 바뀌었습니다 (이전: TLI Hero Rank
한국어 번역). tliherorank.com 번역 기능은 그대로입니다.

■ 새로워진 점
- 바로가기: 툴바 아이콘을 누르면 토치라이트 갤러리, 공식 커뮤니티, tlidb/미니
  토치 DB, 파밍 집계 사이트 등 자주 쓰는 TLI 사이트를 커뮤니티 / DB·조회 / 도구
  탭으로 정리해 바로 열 수 있습니다.
- VoraxRoom 카드 추천: 블러드러스트 수술실 미니게임(madstone290.github.io/
  VoraxRoom)에 접속하면, 예상 최종 활성이 가장 높은 선택지를 자동으로 추천하는
  패널이 화면에 표시됩니다. 계산은 전부 브라우저 안에서 로컬로 이루어지며 외부로
  전송되는 데이터는 없습니다.
```

## 요약 (Summary, 132자 이내)

```
tliherorank.com 히어로 랭킹 페이지 한국어 번역, TLI 커뮤니티/DB 바로가기, VoraxRoom 수술실 미니게임 카드 추천을 한 곳에서 제공하는 Torchlight Infinite 유저 도구 모음입니다.
```

## 상세 설명 (Description)

```
Torchlight Infinite(토치라이트: 인피니트) 한국 유저를 위한 도구 모음
확장 프로그램입니다.

■ 주요 기능
- tliherorank.com의 랭킹 테이블, 필터, 메뉴 등 사이트 UI 전체를 한국어로
  번역합니다. 히어로 이름, 스킬/재능/아이템 이름 등 게임 용어는
  tlidb.com(Torchlight: Infinite 팬 위키)의 공식 한국어 번역을 기준으로
  삼습니다.
- 스킬/팩트스피릿 아이콘에 마우스를 올리면, tlidb.com에서 해당 항목의 상세
  설명을 실시간으로 가져와 정확한 문장으로 보여줍니다.
- 툴바 아이콘을 누르면 토치라이트 갤러리, 공식 커뮤니티, tlidb/미니 토치 DB,
  파밍 집계 사이트 등 자주 쓰는 TLI 관련 사이트 바로가기를 카테고리별 탭으로
  볼 수 있습니다.
- VoraxRoom(블러드러스트 수술실 미니게임, madstone290.github.io/VoraxRoom)에
  접속하면 예상 최종 활성이 가장 높은 선택지를 자동으로 추천하는 패널이 화면에
  표시됩니다. 실제 게임 서버와 통신하지 않는 순수 로컬 계산입니다.

■ 참고
- 이 확장 프로그램은 tliherorank.com, tlidb.com, VoraxRoom 등과 공식 제휴
  관계가 없는 비공식 팬 프로젝트입니다.
- 개인정보를 수집하지 않습니다. 자세한 내용은 개인정보처리방침을 참고하세요.
- 소스 코드는 GitHub에 공개되어 있습니다.

■ 사용법
1. 확장 프로그램을 설치합니다.
2. tliherorank.com에 접속하면 자동으로 한국어로 표시됩니다.
3. 툴바 아이콘을 눌러 번역 켜기/끄기, 바로가기, 카드 추천 안내를 확인할 수
   있습니다.
4. madstone290.github.io/VoraxRoom/에 접속하면 카드 추천 패널이 자동으로
   표시됩니다.
```

## 개인정보처리방침 URL

```
https://listil.github.io/tliherorank-korean-extension/
```

(GitHub Pages 활성화 후 실제 URL로 교체하세요. 저장소 이름을 바꿨다면 경로도
같이 바뀝니다.)

## 단일 목적 설명 (Single purpose)

Chrome Web Store 심사 시 "이 확장 프로그램의 단일 목적이 무엇인가요?"를 물어봅니다.

```
Torchlight Infinite(토치라이트: 인피니트) 한국 유저에게 필요한 편의 기능을 한
확장 프로그램에 모아 제공하는 것이 목적입니다: (1) tliherorank.com 히어로
랭킹 페이지 한국어 번역, (2) TLI 관련 커뮤니티/DB/도구 사이트 바로가기,
(3) VoraxRoom 수술실 미니게임(TLI 인게임 이벤트를 재현한 팬메이드 시뮬레이터)
카드 선택 추천. 세 기능 모두 이 게임 하나의 한국 유저 커뮤니티를 대상으로
하며, 서로 다른 게임이나 무관한 서비스를 다루지 않습니다.
```

## 권한 사용 근거 (Permission justifications)

- **storage**
  ```
  번역 기능의 켜기/끄기 상태, 바로가기 탭에서 마지막으로 본 카테고리 등 사용자
  설정 몇 가지만 로컬 브라우저에 저장하기 위해 사용합니다. 외부로 전송되지
  않습니다.
  ```
- **host permission (https://tlidb.com/*)**
  ```
  스킬/팩트스피릿 아이콘에 마우스를 올렸을 때, tlidb.com(Torchlight: Infinite
  팬 위키)에서 해당 항목의 한국어 설명을 실시간으로 가져오기 위해 사용합니다.
  사용자를 식별하는 정보는 전송하지 않으며, 요청에는 항목 이름만 포함됩니다.
  ```
- **content script on https://tliherorank.com/***
  ```
  번역 기능을 적용할 대상 사이트입니다.
  ```
- **content script on https://madstone290.github.io/VoraxRoom/***
  ```
  VoraxRoom(블러드러스트 수술실 미니게임 시뮬레이터, TLI 팬메이드)에서 카드
  선택지를 화면에서 읽어 최종 활성이 가장 높은 선택지를 계산해 보여주는
  추천 패널을 표시하기 위해 사용합니다. 계산은 전부 브라우저 안에서 로컬로
  이루어지며, 이 사이트로/이 사이트에서 어떤 데이터도 외부로 전송하지
  않습니다.
  ```

## 스크린샷

스토어 규격(1280×800, 투명도 없는 JPEG/24비트 PNG, 최대 5장)에 맞춘 파일이
`docs/`에 준비되어 있습니다. 업로드 순서 추천:

1. `store-screenshot-overview.jpg` — 기능 3가지를 한 장에 모은 요약
2. `store-screenshot-ranking.jpg` — 한국어로 번역된 tliherorank.com 랭킹 (타르타로스 시즌)
3. `store-screenshot-popup.jpg` — 팝업(번역 On/Off, 사전 항목 수, 탭별 바로가기)
4. `store-screenshot-vorax.jpg` — VoraxRoom 카드 추천 패널
5. `store-screenshot-1.png` — 이전 버전 스크린샷 (필요 없으면 생략)

필요하면
`node scripts/verify-extension.mjs`를 실행하거나 아래 방법으로 추가 스크린샷을
직접 찍을 수 있습니다:

1. `chrome://extensions`에서 확장 프로그램 로드
2. tliherorank.com 접속, 원하는 화면으로 이동
3. 브라우저 스크린샷 도구 또는 `node scripts/verify-extension.mjs` 스크립트를
   참고해 Playwright로 캡처

## 업로드용 zip 만들기

Chrome Web Store에는 개발용 파일(scripts/, node_modules/, README 등) 없이
확장 프로그램 본체만 올려야 합니다. 아래 명령으로 업로드용 zip을 만드세요:

```
npm run package
```

`dist/tli-hero-rank-korean-extension.zip`이 생성됩니다. 이 파일을 그대로
개발자 대시보드에 업로드하면 됩니다.
