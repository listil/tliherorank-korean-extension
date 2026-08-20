# Chrome Web Store 등록용 텍스트

개발자 대시보드(https://chrome.google.com/webstore/devconsole)에 그대로 복사해
넣을 수 있도록 정리한 내용입니다.

## 기본 정보

- **이름**: TLI Hero Rank 한국어 번역
- **버전**: manifest.json 기준 자동 반영 (현재 1.0.0)
- **카테고리**: Entertainment / Fun (없으면 Tools)
- **언어**: 한국어

## 요약 (Summary, 132자 이내)

```
tliherorank.com의 Torchlight Infinite 히어로 랭킹 페이지를 한국어로 번역합니다. 스킬 툴팁은 tlidb.com에서 실시간으로 가져옵니다.
```

## 상세 설명 (Description)

```
tliherorank.com(Torchlight Infinite 히어로 랭킹 사이트)을 한국어로 볼 수 있게
해주는 번역 확장 프로그램입니다.

■ 주요 기능
- 랭킹 테이블, 필터, 메뉴 등 사이트 UI 전체를 한국어로 번역합니다.
- 히어로 이름, 스킬/재능/아이템 이름 등 게임 용어는 tlidb.com(Torchlight:
  Infinite 팬 위키)의 공식 한국어 번역을 기준으로 삼습니다.
- 스킬/팩트스피릿 아이콘에 마우스를 올리면, tlidb.com에서 해당 항목의 상세
  설명을 실시간으로 가져와 정확한 문장으로 보여줍니다.

■ 참고
- 이 확장 프로그램은 tliherorank.com, tlidb.com과 공식 제휴 관계가 없는
  비공식 팬 프로젝트입니다.
- 개인정보를 수집하지 않습니다. 자세한 내용은 개인정보처리방침을 참고하세요.
- 소스 코드는 GitHub에 공개되어 있습니다.

■ 사용법
1. 확장 프로그램을 설치합니다.
2. tliherorank.com에 접속하면 자동으로 한국어로 표시됩니다.
3. 툴바 아이콘을 눌러 번역 켜기/끄기를 전환할 수 있습니다.
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
tliherorank.com 페이지의 텍스트를 한국어로 번역해서 보여주는 것이 유일한 목적입니다.
```

## 권한 사용 근거 (Permission justifications)

- **storage**
  ```
  번역 기능의 켜기/끄기 상태 하나만 사용자의 로컬 브라우저에 저장하기 위해
  사용합니다. 외부로 전송되지 않습니다.
  ```
- **host permission (https://tlidb.com/*)**
  ```
  스킬/팩트스피릿 아이콘에 마우스를 올렸을 때, tlidb.com(Torchlight: Infinite
  팬 위키)에서 해당 항목의 한국어 설명을 실시간으로 가져오기 위해 사용합니다.
  사용자를 식별하는 정보는 전송하지 않으며, 요청에는 항목 이름만 포함됩니다.
  ```
- **content script on https://tliherorank.com/***
  ```
  이 확장 프로그램의 유일한 기능(화면 번역)을 적용할 대상 사이트입니다.
  ```

## 스크린샷

`docs/store-screenshot-1.png` (1280×800) 준비되어 있습니다. 필요하면
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
