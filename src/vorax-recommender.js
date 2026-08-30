// Vorax Room 수술실 미니게임에서 예상 최종 활성이 가장 높은 선택지를 추천하는 콘텐츠 스크립트
// (제한 깊이 탐색, 실제 게임과 무관한 로컬 계산). madstone290.github.io/VoraxRoom/ 전용.
"use strict";
(() => {
  // src/hash.ts
  var hashString = (s) => {
    let hash = 2166136261;
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  // src/data.ts
  var RARITIES = ["\uB178\uBA40", "\uB9E4\uC9C1", "\uB808\uC5B4", "\uBCF4\uC2A4"];
  var SPECIES = ["\uB3C5\uCDA9", "\uAC01\uC131\uCCB4", "\uD574\uACE8 \uACBD\uBE44\uBCD1", "\uBCC0\uC774 \uC545\uB9C8"];
  var initialStats = {
    \uB178\uBA40: { activity: 1, quantity: 36 },
    \uB9E4\uC9C1: { activity: 5, quantity: 24 },
    \uB808\uC5B4: { activity: 15, quantity: 12 },
    \uBCF4\uC2A4: { activity: 300, quantity: 1 }
  };
  var monsterRarityWeights = { \uB178\uBA40: 40, \uB9E4\uC9C1: 30, \uB808\uC5B4: 20, \uBCF4\uC2A4: 10 };
  var DEFAULT_REROLLS = { tool: 2, potion: 3 };
  var difficultyPotionTierWeights = {
    practice: { \uB178\uBA40: 20, \uB9E4\uC9C1: 40, \uB808\uC5B4: 40 },
    standard: { \uB178\uBA40: 40, \uB9E4\uC9C1: 40, \uB808\uC5B4: 20 },
    challenge: { \uB178\uBA40: 60, \uB9E4\uC9C1: 30, \uB808\uC5B4: 10 }
  };
  var rareBoxWeights = { \uB178\uBA40: 10, \uB9E4\uC9C1: 40, \uB808\uC5B4: 50 };
  var potionBoxes = [
    { id: "small-potion-box", name: "\uD3EC\uC158 \uC0C1\uC790(\uC18C)", text: "3\uAC1C \uB79C\uB364 \uD3EC\uC158 \uD3EC\uD568", size: 3 },
    { id: "large-potion-box", name: "\uD3EC\uC158 \uC0C1\uC790(\uB300)", text: "5\uAC1C \uB79C\uB364 \uD3EC\uC158 \uD3EC\uD568", size: 5 },
    { id: "rare-small-potion-box", name: "\uB808\uC5B4 \uD3EC\uC158 \uC0C1\uC790(\uC18C)", text: "3\uAC1C \uB79C\uB364 \uD3EC\uC158 \uD3EC\uD568, \uB192\uC740 \uD76C\uADC0\uB3C4 \uD3EC\uC158\uC774 \uB4F1\uC7A5\uD560 \uD655\uB960\uC774 \uB354 \uB192\uC2B5\uB2C8\uB2E4", size: 3, rareWeighted: true }
  ];
  var monsterNames = {
    // 보스에 '공심 고치' 추가: 실측(2026-08-28 라이브 플레이 라운드9, 활성271×수량470)으로 확인.
    \uB3C5\uCDA9: { \uB178\uBA40: ["\uD68C\uC0C9 \uB098\uBC29", "\uC545\uB9C8 \uAC70\uBBF8"], \uB9E4\uC9C1: ["\uBD80\uC2DD \uD30C\uB9AC", "\uBD89\uC740 \uC0AC\uB9C8\uADC0"], \uB808\uC5B4: ["\uAE30\uC0DD \uB098\uBE44", "\uBD89\uC740 \uBC18\uC810 \uD48D\uB385\uC774"], \uBCF4\uC2A4: ["\uAC70\uB300 \uD3ED\uC2DD \uC5F0\uCDA9", "\uACF5\uC2EC \uACE0\uCE58"] },
    \uAC01\uC131\uCCB4: { \uB178\uBA40: ["\uC9C0\uD61C\uB85C\uC6B4 \uC790", "\uD559\uC790"], \uB9E4\uC9C1: ["\uC21C\uB840\uC790", "\uBAB0\uB77D\uC790", "\uAE08\uC9C0\uB41C \uC11C\uC801 \uD559\uC790"], \uB808\uC5B4: ["\uC774\uB2E8 \uD559\uC790"], \uBCF4\uC2A4: ["\uACE0\uD589\uC758 \uB300\uC8FC\uAD50", "\uBE44\uC2B9\uD55C \uC131\uB3C4"] },
    "\uD574\uACE8 \uACBD\uBE44\uBCD1": { \uB178\uBA40: ["\uBCD1\uC0AC", "\uAD81\uC218"], \uB9E4\uC9C1: ["\uB179\uC2A8 \uBBF8\uB298\uCC3D\uBCD1", "\uC11D\uAD81\uBCD1"], \uB808\uC5B4: ["\uC21C\uCC30 \uACBD\uBE44\uBCD1", "\uBC29\uD328 \uACBD\uBE44\uBCD1"], \uBCF4\uC2A4: ["\uD574\uACE8 \uAD50\uB3C4\uAD00"] },
    // 노멀·레어는 실제 게임 스크린샷으로 직접 확인(변이 몬스터/마안의 날개).
    "\uBCC0\uC774 \uC545\uB9C8": { \uB178\uBA40: ["\uC804\uAC08 \uBAAC\uC2A4\uD130", "\uBCC0\uC774 \uBAAC\uC2A4\uD130"], \uB9E4\uC9C1: ["\uAC00\uC2DC \uB3C4\uB9C8\uBC40", "\uC2A4\uD50C\uB9BF \uC870"], \uB808\uC5B4: ["\uB9C8\uC548\uC758 \uB0A0\uAC1C", "\uBD80\uC2DD \uB0AD\uC885 \uBAAC\uC2A4\uD130"], \uBCF4\uC2A4: ["\uD64D\uC5ED \uCF00\uB974\uBCA0\uB85C\uC2A4"] }
  };
  var TOOL_THRESHOLDS = [8e3, 28e3];
  var tools = [
    { id: "sanctum-madonna", timing: "general", name: "\uAC10\uC5FC \uAD6C\uC5ED \uC131\uBAA8\uC0C1", text: "2 \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uAC01 \uD76C\uADC0\uB3C4 \uB0B4 \uB79C\uB364 1 \uADF8\uB8F9\uC744 1 \uD2F0\uC5B4 \uB192\uC740 \uD76C\uADC0\uB3C4\uB85C \uAC01\uC131" },
    { id: "canine-rasp", timing: "general", name: "\uACAC\uCE58 \uC904\uCE7C", text: "\uB77C\uC6B4\uB4DC \uC885\uB8CC \uC2DC, \uD65C\uC131\uC774 255 \uCD08\uACFC\uC778 \uBAAC\uC2A4\uD130 \uC218\uB7C9 +30" },
    { id: "writhing-spine", timing: "general", name: "\uAFC8\uD2C0\uB300\uB294 \uCC99\uC218", text: "\uBAAC\uC2A4\uD130 \uCCA8\uAC00 \uC2DC\uB9C8\uB2E4 75% \uD655\uB960\uB85C \uBCC0\uC774 \uC545\uB9C8\uB85C \uBCC0\uC774 + \uD65C\uC131 +80" },
    // text는 실제 카드 문구로 교체(실측: 2026-08-26T02-31-34-711Z.png) — "라운드마다"가 빠져있던 이전
    // text는 카드-OCR 매칭(recognize-card.ts) 기준 문자열로 쓰이는데, 실제 문구엔 있는 "라운드마다"가
    // 빠져 있으면 편집거리가 불필요하게 벌어진다(교정 기록 4건 — 유독 자주 오매칭됐던 이유).
    { id: "rawhide-restraint", timing: "general", name: "\uB0A0\uAC00\uC8FD \uAD6C\uC18D\uB300", text: "\uB9E4\uC9C1 \uBAAC\uC2A4\uD130 3 \uADF8\uB8F9 \uBCF4\uC720 \uC2DC, \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uCD1D \uD65C\uC131\uC774 \uAC00\uC7A5 \uB192\uC740 1 \uADF8\uB8F9 \uBAAC\uC2A4\uD130 \uC218\uB7C9 +100" },
    { id: "eyelid-retractor", timing: "general", name: "\uB208\uAEBC\uD480 \uD655\uC7A5\uAE30", text: "\uBAAC\uC2A4\uD130 \uC81C\uAC70 \uC2DC \uCD1D \uD65C\uC131 \uCD5C\uACE0 1 \uADF8\uB8F9 \uD65C\uC131 +20, \uC218\uB7C9 +20" },
    { id: "dirty-knife", timing: "general", name: "\uB354\uB7EC\uC6B4 \uC808\uC0AD\uCE7C", text: "\uB77C\uC6B4\uB4DC \uC885\uB8CC \uC2DC, \uC218\uB7C9\uC774 275 \uCD08\uACFC\uC778 \uBAAC\uC2A4\uD130 \uD65C\uC131 +20" },
    // text는 실제 카드 문구로 교체(실측: 2026-08-26T05-19-39-589Z.png) — 이전 text의 "레어(이상)"는
    // 화면에 없는 표현이고 실제로는 "강적"이라는 완전히 다른 단어가 쓰인다(글자가 하나도 안 겹쳐서
    // 편집거리가 크게 벌어짐). "라운드마다"도 빠져 있었다(교정 기록 3건).
    { id: "tanned-restraint", timing: "general", name: "\uBB34\uB450\uC9C8 \uAC00\uC8FD \uAD6C\uC18D\uB300", text: "\uB178\uBA40, \uB9E4\uC9C1 \uBC0F \uAC15\uC801 \uBAAC\uC2A4\uD130 \uB3D9\uC2DC \uBCF4\uC720 \uC2DC, \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uBAA8\uB4E0 \uBAAC\uC2A4\uD130 \uD65C\uC131 +20" },
    { id: "iron-bonesaw", timing: "general", name: "\uBB34\uC1E0 \uBF08\uD1B1", text: "\uB77C\uC6B4\uB4DC \uC885\uB8CC \uC2DC, \uC218\uB7C9\xB7\uD65C\uC131 \uBAA8\uB450 150 \uCD08\uACFC\uC778 \uBAAC\uC2A4\uD130 \uD65C\uC131 +15, \uC218\uB7C9 +15" },
    { id: "insect-egg-cluster", timing: "general", name: "\uBC8C\uB808\uC54C \uAD70\uC9D1", text: "\uB3C5\uCDA9 3 \uADF8\uB8F9 \uC774\uC0C1 \uBCF4\uC720 \uC2DC, \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uB3C5\uCDA9 1 \uADF8\uB8F9 \uCCA8\uAC00(\uC218\uB7C9 +100)" },
    { id: "hatching-sac", timing: "pre", name: "\uBD80\uD654\uB0AD", text: "\uB3C5\uCDA9 2 \uADF8\uB8F9 \uC774\uC0C1 \uBCF4\uC720 \uC2DC, \uBAAC\uC2A4\uD130 \uCCA8\uAC00 \uC2DC\uB9C8\uB2E4 \uBAA8\uB4E0 \uADF8\uB8F9 \uC218\uB7C9 +45" },
    { id: "bloated-pituitary", timing: "pre", name: "\uBE44\uB300\uD55C \uB1CC\uD558\uC218\uCCB4", text: "\uB808\uC5B4 \uB610\uB294 \uC808\uB300\uC790(\uBCF4\uC2A4) \uAC01\uC131\uCCB4 \uBCF4\uC720 \uC2DC, \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uB79C\uB364 1 \uADF8\uB8F9 \uD65C\uC131 +80" },
    { id: "nettle-knot", timing: "general", name: "\uC410\uAE30\uD480 \uB9E4\uB4ED", text: "\uB178\uBA40 3 \uADF8\uB8F9 \uC774\uC0C1 \uBCF4\uC720 \uC2DC, \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uBAA8\uB4E0 \uADF8\uB8F9 \uC218\uB7C9 +30" },
    { id: "atypical-needle", timing: "general", name: "\uC774\uD615 \uB3C5\uCE68", text: "3 \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uBAA8\uB4E0 \uBAAC\uC2A4\uD130\uB97C \uB79C\uB364 \uBAAC\uC2A4\uD130\uB85C \uBCC0\uC774" },
    { id: "stained-liver", timing: "pre", name: "\uC5BC\uB8E9\uC9C4 \uAC04", text: "\uBCC0\uC774 \uC545\uB9C8 2 \uADF8\uB8F9 \uC774\uC0C1 \uBCF4\uC720 \uC2DC, \uBCC0\uC774\uC2DC\uD0AC \uB54C\uB9C8\uB2E4 \uBAA8\uB4E0 \uADF8\uB8F9 \uD65C\uC131 +20" },
    { id: "tangled-ulna", timing: "pre", name: "\uC5C9\uCF1C\uBD99\uC740 \uCC99\uACE8", text: "\uD574\uACE8 \uACBD\uBE44\uBCD1 2 \uADF8\uB8F9 \uC774\uC0C1 \uBCF4\uC720 \uC2DC, \uC81C\uAC70\uD560 \uB54C\uB9C8\uB2E4 \uB79C\uB364 1 \uADF8\uB8F9 \uC218\uB7C9 +180" },
    { id: "shrunken-finger", timing: "pre", name: "\uC624\uADF8\uB77C\uB4E0 \uC190\uAC00\uB77D", text: "\uD574\uACE8 \uACBD\uBE44\uBCD1\uC774 \uC544\uB2CC \uBAAC\uC2A4\uD130 \uC81C\uAC70 \uC2DC \uB79C\uB364 1 \uADF8\uB8F9 \uC218\uB7C9 +150" },
    { id: "atypical-granuloma", timing: "pre", name: "\uC774\uD615\uC758 \uC721\uC544\uC885", text: "\uBAAC\uC2A4\uD130\uAC00 \uBCC0\uC774 \uC545\uB9C8\uB85C \uBCC0\uC774 \uC2DC, \uBAA8\uB4E0 \uADF8\uB8F9 \uD65C\uC131 +35" },
    // text는 실제 카드 화면 문구 그대로("턴 종료 시, 현재 보유 독충 그룹 수 X, 랜덤 X 그룹 몬스터당
    // 수량 +8, X회 중복 적용된다" — 실측 스크린샷으로 확인, 2026-08-26T02-41-09-710Z.png). 예전엔
    // "라운드 종료 시, 독충 그룹 수 X에 대해 삼각수(1+2+...+X) 회 랜덤 1~2 그룹 수량 +8"처럼 개발자가
    // 메커니즘을 요약한 문장이 들어있었는데("턴"이 아닌 "라운드", "삼각수" 같은 화면에 없는 표현) —
    // OCR 카드 인식(recognize-card.ts)이 이 text를 정답 기준 문자열로 쓰기 때문에, 실제 화면 문구와
    // 다르면 OCR이 아무리 깨끗하게 읽어도 편집거리가 크게 벌어져 다른 카드(예: 부화낭)로 오매칭되는
    // 원인이 됐다(실측 확인 — 인간 번데기 표본이 card-ocr-corrections.json에 유독 자주 등록돼 있던
    // 이유). 삼각수(1+2+...+X) 메커니즘 자체는 effects.ts의 human-pupa 구현(repeats = count*(count+1)/2)
    // 에 그대로 살아있으니 text를 화면 그대로로 바꿔도 게임 로직엔 영향 없다.
    { id: "human-pupa", timing: "pre", name: "\uC778\uAC04 \uBC88\uB370\uAE30 \uD45C\uBCF8", text: "\uD134 \uC885\uB8CC \uC2DC, \uD604\uC7AC \uBCF4\uC720 \uB3C5\uCDA9 \uADF8\uB8F9 \uC218 X, \uB79C\uB364 X \uADF8\uB8F9 \uBAAC\uC2A4\uD130\uB2F9 \uC218\uB7C9 +8, X\uD68C \uC911\uBCF5 \uC801\uC6A9\uB41C\uB2E4" },
    { id: "proliferated-frontal", timing: "pre", name: "\uC99D\uC2DD\uD55C \uC804\uB450\uC5FD", text: "\uAC01\uC131\uCCB4 2 \uADF8\uB8F9 \uC774\uC0C1 \uBCF4\uC720 \uC2DC, \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uB79C\uB364 \uB808\uC5B4/\uBCF4\uC2A4 1 \uADF8\uB8F9 \uD65C\uC131 +80" },
    { id: "molting-cortex", timing: "general", name: "\uD0C8\uD53C \uB1CC\uD53C\uC9C8", text: "\uB77C\uC6B4\uB4DC \uC885\uB8CC \uC2DC \uB79C\uB364 \uB9E4\uC9C1 2 \uADF8\uB8F9\uC744 \uB808\uC5B4 \uAC01\uC131\uCCB4\uB85C \uC735\uD569" },
    { id: "twice-bone-beak", timing: "general", name: "\uD2B8\uC640\uC774\uC2A4 \uBCF8\uC758 \uBD80\uB9AC", text: "2~5 \uADF8\uB8F9\uC774\uBA74 1 \uADF8\uB8F9 \uCCA8\uAC00, 6 \uADF8\uB8F9\uC774\uBA74 \uCD5C\uACE0\uAC00 \uCD5C\uC800\uB97C \uC7A0\uC2DD" },
    { id: "brooding-butterfly", timing: "general", name: "\uD3EC\uB780 \uB098\uBE44", text: "3 \uB77C\uC6B4\uB4DC\uB9C8\uB2E4 \uB79C\uB364 \uB3C5\uCDA9 2 \uADF8\uB8F9\uC744 \uB3C5\uCDA9 1 \uADF8\uB8F9\uC73C\uB85C \uC735\uD569" },
    { id: "tendon-crushing-rope", timing: "general", name: "\uD798\uC904 \uBD84\uC1C4 \uBC27\uC904", text: "\uD574\uACE8 \uACBD\uBE44\uBCD1 2 \uADF8\uB8F9 \uC774\uC0C1 \uBCF4\uC720 \uC2DC, \uCD5C\uC800 \uBE44-\uD574\uACE8 \uBAAC\uC2A4\uD130\uB97C \uC81C\uAC70\uD574 \uB79C\uB364 \uD574\uACE8 \uACBD\uBE44\uBCD1\uC774 \uD761\uC218" },
    { id: "black-goat-gut", timing: "general", name: "\uD751\uC5FC\uC18C \uAC70\uD2B8", text: "\uB77C\uC6B4\uB4DC \uC885\uB8CC \uC2DC \uB3D9\uC77C \uD76C\uADC0\uB3C4 3 \uADF8\uB8F9\uB9C8\uB2E4 \uC0C1\uC704 \uD76C\uADC0\uB3C4 1 \uADF8\uB8F9\uC73C\uB85C \uC735\uD569(\uBCF4\uC2A4 \uC81C\uC678)" },
    { id: "two-inch-skull-needle", timing: "general", name: "2 \uC778\uCE58 \uB450\uAC1C\uACE8 \uACE8\uCE68", text: "\uCCA8\uAC00 \uC2DC \uD0F1\uD06C \uCD08\uACFC\uBA74 \uCD5C\uC800 1 \uADF8\uB8F9 \uD65C\uC131 +25, \uC218\uB7C9 +25" }
  ];
  var target = (min = 1, max = min, extra = {}) => ({ min, max, ...extra });
  var potions = [
    { id: "micromelia-skeleton", name: "\uB9C8\uC774\uD06C\uB85C\uBA5C\uB9AC\uC544 \uAC00\uB8E8\uC57D-\uD574\uACE8\uACBD\uBE44\uBCD1", tier: "\uB178\uBA40", text: "\uD574\uACE8 \uACBD\uBE44\uBCD1 1 \uADF8\uB8F9 \uCCA8\uAC00, \uC218\uB7C9 +73" },
    { id: "micromelia-insect", name: "\uB9C8\uC774\uD06C\uB85C\uBA5C\uB9AC\uC544 \uAC00\uB8E8\uC57D-\uB3C5\uCDA9", tier: "\uB178\uBA40", text: "\uB3C5\uCDA9 1 \uADF8\uB8F9 \uCCA8\uAC00, \uC218\uB7C9 +73" },
    { id: "anesthetic-mutant", name: "\uB9C8\uCDE8 \uD305\uD06C-\uBCC0\uC774 \uC545\uB9C8", tier: "\uB178\uBA40", text: "\uC120\uD0DD \uB300\uC0C1 \uBCC0\uC774 \uC545\uB9C8\uB85C \uBCC0\uC774, 50%\uB85C \uB79C\uB364 1 \uADF8\uB8F9 \uCD94\uAC00 \uBCC0\uC774", target: target() },
    { id: "anesthetic-awakened", name: "\uB9C8\uCDE8 \uD305\uD06C-\uAC01\uC131\uCCB4", tier: "\uB178\uBA40", text: "\uC120\uD0DD \uB300\uC0C1 \uAC01\uC131\uCCB4\uB85C \uBCC0\uC774 \uD6C4 \uB9E4\uC9C1\uC73C\uB85C \uAC01\uC131", target: target() },
    { id: "heterogeneous-hormone", name: "\uC774\uC885 \uD638\uB974\uBAAC", tier: "\uB178\uBA40", text: "\uC120\uD0DD 1~2 \uADF8\uB8F9 \uC81C\uAC70, \uB79C\uB364 \uBAAC\uC2A4\uD130 4 \uADF8\uB8F9 \uCCA8\uAC00(\uD65C\uC131 +5)", target: target(1, 2) },
    { id: "twin-insect", name: "\uC30D\uB465\uC774 \uD638\uB974\uBAAC-\uB3C5\uCDA9", tier: "\uB178\uBA40", text: "\uC120\uD0DD \uB300\uC0C1 \uB3C5\uCDA9\uC73C\uB85C \uBCC0\uC774 + \uB3D9\uC77C \uBAAC\uC2A4\uD130 1 \uADF8\uB8F9 \uCCA8\uAC00", target: target() },
    { id: "twin-skeleton", name: "\uC30D\uB465\uC774 \uD638\uB974\uBAAC-\uD574\uACE8\uACBD\uBE44\uBCD1", tier: "\uB178\uBA40", text: "\uC120\uD0DD \uB300\uC0C1 \uD574\uACE8 \uACBD\uBE44\uBCD1\uC73C\uB85C \uBCC0\uC774, \uC218\uB7C9 +62", target: target() },
    { id: "spinal-awakened", name: "\uCC99\uC218\uC6A9\uC561-\uAC01\uC131\uCCB4", tier: "\uB178\uBA40", text: "\uAC01\uC131\uCCB4 1 \uADF8\uB8F9 \uCCA8\uAC00, \uD65C\uC131 +31" },
    { id: "spinal-mutant", name: "\uCC99\uC218\uC6A9\uC561-\uBCC0\uC774 \uC545\uB9C8", tier: "\uB178\uBA40", text: "\uBCC0\uC774 \uC545\uB9C8 1 \uADF8\uB8F9 \uCCA8\uAC00, \uD65C\uC131 +31" },
    { id: "targeted-hormone", name: "\uD45C\uC801 \uC774\uC885 \uD638\uB974\uBAAC", tier: "\uB178\uBA40", text: "\uC120\uD0DD \uB300\uC0C1 \uC81C\uAC70, \uB79C\uB364 \uC885\uC871 \uB9E4\uC9C1 2 \uADF8\uB8F9 \uCCA8\uAC00(\uC218\uB7C9 +25)", target: target() },
    { id: "strong-removal-powder", name: "\uAC15\uB825 \uC774\uC885 \uC81C\uAC70 \uAC00\uB8E8\uC57D", tier: "\uB9E4\uC9C1", text: "\uC120\uD0DD \uB300\uC0C1 \uC218\uB7C9 +154, \uB2E4\uB978 \uC885\uC871 2 \uADF8\uB8F9 \uC81C\uAC70", target: target() },
    { id: "sticky-bile", name: "\uB048\uC801\uD55C \uB2F4\uC999 \uC6A9\uC561", tier: "\uB9E4\uC9C1", text: "1 \uADF8\uB8F9 \uBAAC\uC2A4\uD130\uB97C \uC120\uD0DD \uADF8 \uC6B0\uCE21\uC758 \uBAAC\uC2A4\uD130\uB97C \uAC19\uC740 \uC885\uB958\uC758 \uBAAC\uC2A4\uD130\uB85C \uBCC0\uC774\uC2DC\uD0A4\uACE0 \uC591\uCE21 \uAC01\uAC01 \uD65C\uC131 +31", target: target() },
    { id: "hollow-spine", name: "\uACF5\uC2EC \uCC99\uC218 \uC6A9\uC561", tier: "\uB9E4\uC9C1", text: "\uC120\uD0DD \uB300\uC0C1 \uD65C\uC131 +41, 50%\uB85C \uBCC0\uC774 \uC545\uB9C8\uB85C \uBCC0\uC774", target: target() },
    { id: "eggshell-powder", name: "\uB09C\uAC01 \uAC00\uB8E8\uC57D", tier: "\uB9E4\uC9C1", text: "\uB79C\uB364 1 \uADF8\uB8F9 \uC218\uB7C9 +25, \uB3C5\uCDA9\uC774\uBA74 \uB3D9\uC77C \uB3C5\uCDA9 1 \uADF8\uB8F9 \uCD94\uAC00 \uCCA8\uAC00" },
    { id: "unmixed-tincture", name: "\uBBF8\uD63C \uD305\uD06C", tier: "\uB9E4\uC9C1", text: "1 \uADF8\uB8F9 \uBAAC\uC2A4\uD130\uB97C \uC120\uD0DD\uD574 1 \uD2F0\uC5B4 \uB192\uC740 \uD76C\uADC0\uB3C4 \uBAAC\uC2A4\uD130\uB85C \uAC01\uC131\uC2DC\uD0A8\uB2E4", target: target() },
    { id: "breeding-powder", name: "\uBC88\uC2DD \uAC00\uB8E8\uC57D", tier: "\uB9E4\uC9C1", text: "\uD76C\uADC0\uB3C4\uAC00 \uAC01\uAE30 \uB2E4\uB978 \uB79C\uB364 4 \uADF8\uB8F9 \uC218\uB7C9 +32" },
    { id: "mutation-powder", name: "\uBCC0\uC774 \uC720\uB3C4 \uAC00\uB8E8\uC57D", tier: "\uB9E4\uC9C1", text: "\uC120\uD0DD 1~2 \uADF8\uB8F9 \uC218\uB7C9 +52, \uB79C\uB364 \uB808\uC5B4\uB85C \uBCC0\uC774", target: target(1, 2) },
    { id: "brainfog-tincture", name: "\uBE0C\uB808\uC778\uD3EC\uADF8 \uD305\uD06C", tier: "\uB9E4\uC9C1", text: "\uB79C\uB364 1 \uADF8\uB8F9 \uD65C\uC131 +41, \uAC01\uC131\uCCB4\uBA74 \uB808\uC5B4\uB85C \uAC01\uC131" },
    { id: "raw-bone-powder", name: "\uC0DD\uACE8 \uAC00\uB8E8\uC57D", tier: "\uB9E4\uC9C1", text: "\uB79C\uB364 1 \uADF8\uB8F9 \uC218\uB7C9 +40, \uD574\uACE8 \uACBD\uBE44\uBCD1\uC774\uBA74 +127 \uBC0F \uBE44-\uD574\uACE8 1 \uADF8\uB8F9 \uC81C\uAC70" },
    { id: "digestive-enzyme", name: "\uC18C\uD654 \uD6A8\uC18C \uC6A9\uC561", tier: "\uB9E4\uC9C1", text: "\uC120\uD0DD \uB300\uC0C1 \uD65C\uC131 +61, \uC88C\uCE21 1 \uADF8\uB8F9 \uC81C\uAC70", target: target() },
    { id: "pure-leech", name: "\uC21C\uC218 \uAC70\uBA38\uB9AC \uC6A9\uC561", tier: "\uB9E4\uC9C1", text: "\uC120\uD0DD \uB300\uC0C1 \uD3EC\uD568 \uB3D9\uC77C \uC885\uC871 2 \uADF8\uB8F9 \uD65C\uC131 +31", target: target() },
    { id: "removal-powder", name: "\uC774\uC885 \uC81C\uAC70 \uAC00\uB8E8\uC57D", tier: "\uB9E4\uC9C1", text: "\uC120\uD0DD \uB300\uC0C1 \uC218\uB7C9 +127, \uB2E4\uB978 \uC885\uC871 1 \uADF8\uB8F9 \uC81C\uAC70", target: target() },
    { id: "blue-bile", name: "\uD478\uB978 \uB2F4\uC999 \uC6A9\uC561", tier: "\uB9E4\uC9C1", text: "1~2 \uADF8\uB8F9 \uBAAC\uC2A4\uD130\uB97C \uC120\uD0DD\uD574 \uB79C\uB364 \uB9E4\uC9C1 \uBAAC\uC2A4\uD130\uB85C \uBCC0\uC774\uC2DC\uD0A4\uACE0 \uD65C\uC131 +31", target: target(1, 2) },
    { id: "mixed-leech", name: "\uD63C\uD569 \uAC70\uBA38\uB9AC \uC6A9\uC561", tier: "\uB9E4\uC9C1", text: "\uC120\uD0DD \uB300\uC0C1 \uD3EC\uD568 \uB3D9\uC77C \uD76C\uADC0\uB3C4 2 \uADF8\uB8F9 \uD65C\uC131 +31", target: target() },
    { id: "active-growth-hormone", name: "\uD65C\uC131 \uBC30\uC721 \uD638\uB974\uBAAC", tier: "\uB9E4\uC9C1", text: "\uB3C5\uCDA9 1 \uADF8\uB8F9 \uCCA8\uAC00, 50%\uB85C 2 \uADF8\uB8F9 \uCD94\uAC00 \uCCA8\uAC00" },
    { id: "gray-spine", name: "\uD68C\uBC31\uC9C8 \uCC99\uC218 \uC6A9\uC561", tier: "\uB9E4\uC9C1", text: "\uB79C\uB364 1 \uADF8\uB8F9 \uD65C\uC131 +41 \uBC0F \uB79C\uB364 \uBCC0\uC774, 50%\uB85C \uBCC0\uC774 \uC545\uB9C8 \uC7AC\uBCC0\uC774 + \uD65C\uC131 +30" },
    { id: "petrified-spine", name: "\uC11D\uD654 \uCC99\uC218 \uC6A9\uC561", tier: "\uB808\uC5B4", text: "\uC120\uD0DD \uB300\uC0C1 \uD65C\uC131 +20, \uBCC0\uC774 \uC545\uB9C8 \uC544\uB2C8\uBA74 \uBCC0\uC774 \uC545\uB9C8\uB85C \uBCC0\uC774 + \uCD94\uAC00 \uD65C\uC131 +30", target: target() },
    { id: "meningeal-solution", name: "\uC5F0\uC218\uB9C9 \uC6A9\uC561", tier: "\uB808\uC5B4", text: "\uC120\uD0DD \uB300\uC0C1 \uD65C\uC131 +30(\uB9E4\uC9C1 \uAC01\uC131\uCCB4 2 \uD68C, \uB808\uC5B4/\uBCF4\uC2A4 \uAC01\uC131\uCCB4 3 \uD68C)", target: target() },
    // text는 실제 카드 문구로 교체(실측: 2026-08-25T16-39-22-657Z.png 카드0) — 교정 기록 3건.
    { id: "boil-ointment", name: "\uC885\uAE30 \uCE58\uB8CC \uC5F0\uACE0", tier: "\uB808\uC5B4", text: "1 \uADF8\uB8F9 \uBAAC\uC2A4\uD130\uB97C \uC120\uD0DD\uD574 \uD65C\uC131 +20, \uD574\uACE8 \uACBD\uBE44\uBCD1 \uCD94\uAC00 \uC2DC \uC218\uB7C9 +41 \uBC0F \uD574\uACE8 \uACBD\uBE44\uBCD1\uC758 \uC6B0\uCE21 \uBAAC\uC2A4\uD130\uB97C \uC81C\uAC70\uD55C\uB2E4", target: target() },
    // text는 실제 카드 문구로 교체(실측: 2026-08-25T16-41-50-430Z.png 카드2) — 교정 기록 3건.
    { id: "probiotic-enzyme", name: "\uD504\uB85C\uBC14\uC774\uC624\uD2F1 \uD6A8\uC18C \uC6A9\uC561", tier: "\uB808\uC5B4", text: "1 \uADF8\uB8F9 \uB3C5\uCDA9 \uBCF4\uC720 \uC2DC\uB9C8\uB2E4 \uBAA8\uB4E0 \uB3C5\uCDA9 \uD65C\uC131 +11" },
    { id: "molting-solution", name: "\uD5C8\uBB3C \uC6A9\uC561", tier: "\uB808\uC5B4", text: "\uC120\uD0DD 1~2 \uADF8\uB8F9\uC744 \uB3C5\uCDA9 1 \uADF8\uB8F9\uC73C\uB85C \uC735\uD569", target: target(1, 2) },
    // 실제 카드 화면 문구는 "최소 1 그룹 해골 경비병 보유 시, 해골 경비병이 아닌 몬스터 그룹을
    // 랜덤으로"에서 문장이 끊긴 채로 표시된다(실측: 2026-08-25T16-39-22-657Z.png 카드1, 크롭을
    // 카드 하단 넘어 확인 버튼 영역까지 넉넉히 잡아도 이어지는 문구가 없음 — 게임 UI 자체의 말줄임).
    // OCR이 볼 수 있는 텍스트가 딱 여기까지라서, "제거하며 그룹당 활성/수량 +28"처럼 화면에 없는
    // 뒷부분까지 text에 넣어두면 편집거리만 부풀린다(교정 기록 6건 — 가장 많이 오매칭됐던 카드).
    // 실제 효과("비-해골 랜덤 3그룹 제거, 그룹당 활성/수량 +28")는 effects.ts 구현에 그대로 있다.
    { id: "ossification-ointment", name: "\uD654\uACE8 \uC5F0\uACE0", tier: "\uB808\uC5B4", text: "\uCD5C\uC18C 1 \uADF8\uB8F9 \uD574\uACE8 \uACBD\uBE44\uBCD1 \uBCF4\uC720 \uC2DC, \uD574\uACE8 \uACBD\uBE44\uBCD1\uC774 \uC544\uB2CC \uBAAC\uC2A4\uD130 \uADF8\uB8F9\uC744 \uB79C\uB364\uC73C\uB85C" },
    { id: "active-spine-powder", name: "\uD65C\uC131 \uCC99\uC218 \uAC00\uB8E8\uC57D", tier: "\uB808\uC5B4", text: "\uBE44-\uBCC0\uC774\uC545\uB9C8 \uCD5C\uB300 3 \uADF8\uB8F9\uC744 \uBCC0\uC774 \uC545\uB9C8\uB85C \uBCC0\uC774, \uADF8\uB8F9\uB2F9 \uB79C\uB364 \uBCC0\uC774\uC545\uB9C8 3 \uADF8\uB8F9 \uC218\uB7C9 +42" },
    // 절대자(보스) 등급 포션 — 실제 게임에서 확인됨. 등장 확률(difficultyPotionTierWeights)은
    // 아직 실측치가 없어서 반영하지 않았다(가중치 표에 키가 없으면 롤아웃에서 절대 안 뽑히는
    // 쪽으로 안전하게 fallback — 미래 라운드에서 또 나올 가능성을 과소평가할 뿐, 과대평가는 안 함).
    { id: "insect-attractant", name: "\uBC8C\uB808 \uC720\uC778\uC81C", tier: "\uC808\uB300\uC790", text: "4 \uADF8\uB8F9 \uB3C5\uCDA9\uC744 \uCCA8\uAC00\uD55C\uB2E4. 1\uADF8\uB8F9 \uCD08\uACFC \uC2DC \uB9C8\uB2E4 \uBCF4\uC720\uD55C \uB3C5\uCDA9 \uD65C\uC131 +10, \uC218\uB7C9 +15" },
    // 실측: 2026-08-28 실제 라이브 플레이 중 발견(라운드2 포션 선택지, 절대자 등급). "감염 구역"
    // 접두어는 sanctum-madonna(감염 구역 성모상)와 같은 테마 계열로 보인다.
    { id: "infected-zone-dressing", name: "\uAC10\uC5FC \uAD6C\uC5ED \uD1A0\uD0C4 \uB4DC\uB808\uC2F1", tier: "\uC808\uB300\uC790", text: "\uCD5C\uC18C 1 \uADF8\uB8F9 \uD574\uACE8 \uACBD\uBE44\uBCD1 \uBCF4\uC720 \uC2DC, \uD574\uACE8 \uACBD\uBE44\uBCD1\uC744 \uC81C\uC678\uD55C \uBAA8\uB4E0 \uBAAC\uC2A4\uD130\uB97C \uC81C\uAC70\uD55C\uB2E4. 1 \uADF8\uB8F9 \uBAAC\uC2A4\uD130 \uC81C\uAC70 \uC2DC\uB9C8\uB2E4 \uBAA8\uB4E0 \uD574\uACE8 \uACBD\uBE44\uBCD1 \uD65C\uC131 +20, \uC218\uB7C9 +39" },
    // 실측: 2026-08-28 실제 라이브 플레이 중 발견(라운드2 포션 선택지, 절대자 등급).
    { id: "compound-vitality-pill", name: "\uBCF5\uBC29 \uD65C\uB825 \uC54C\uC57D", tier: "\uC808\uB300\uC790", text: "\uBAA8\uB4E0 \uBAAC\uC2A4\uD130\uB97C \uB79C\uB364 \uBCC0\uC774 \uC545\uB9C8\uB85C \uBCC0\uC774\uC2DC\uD0A4\uACE0 \uD65C\uC131 +11, \uB9E4\uC9C1 \uBCC0\uC774 \uC545\uB9C8 \uCD94\uAC00 \uD65C\uC131 +11, \uB808\uC5B4 \uBC0F \uBCF4\uC2A4 \uBCC0\uC774 \uC545\uB9C8 \uCD94\uAC00 \uC218\uB7C9 +11" },
    // 실측: 2026-08-30 실제 라이브 플레이 중 발견(라운드2 포션 선택지, 절대자 등급).
    { id: "ritual-recovery-salt", name: "\uC758\uC2DD \uD68C\uBCF5\uC6A9 \uC18C\uAE08", tier: "\uC808\uB300\uC790", text: "\uB79C\uB364 1 \uADF8\uB8F9 \uBAAC\uC2A4\uD130 \uC120\uD0DD, \uD65C\uC131 +111, \uC218\uB7C9 +111" }
  ];
  var plans = [
    { id: "abdominal-stone", name: "\uAC1C\uBCF5 \uACB0\uC11D \uC81C\uAC70 \uC694\uBC95", risk: "\uB192\uC74C", bonus: 0.2, text: "\uBAAC\uC2A4\uD130 \uCC98\uCE58 \uC2DC \uBE14\uB7EC\uB4DC \uB7EC\uC2A4\uD2B8 \uC870\uC57D\uB3CC \uC0DD\uC131" },
    { id: "cyst-blast", name: "\uB0AD\uC885 \uD3ED\uD30C \uC694\uBC95", risk: "\uB192\uC74C", bonus: 0.2, text: "\uCD5C\uC885 \uC804\uD22C \uD3ED\uBC1C\uB0AD 5~10\uAC1C \uB4F1\uC7A5" },
    { id: "laser-cut", name: "\uB808\uC774\uC800 \uC808\uB2E8 \uC218\uC220", risk: "\uB192\uC74C", bonus: 0.2, text: "\uCD5C\uC885 \uC804\uD22C \uB808\uC774\uC800 \uC808\uB2E8\uCE7C \uCD9C\uD604" },
    { id: "full-acupuncture", name: "\uC804\uC2E0 \uCE68\uC220 \uC694\uBC95", risk: "\uB192\uC74C", bonus: 0.2, text: "\uCD5C\uC885 \uC804\uD22C \uB300\uADDC\uBAA8 \uC758\uB8CC\uC6A9 \uD638\uCE68 \uCD9C\uD604" },
    { id: "trepanation", name: "\uCC9C\uB450\uC220", risk: "\uB192\uC74C", bonus: 0.2, text: "\uCD5C\uC885 \uC804\uD22C \uB450\uAC1C\uACE8 \uACE8\uCE68 5~10\uAC1C \uB4F1\uC7A5" },
    { id: "frontal-restoration", name: "\uC804\uB450\uC5FD \uBCF5\uC6D0\uC220", risk: "\uBCF4\uD1B5", bonus: 0.1, text: "\uB808\uC5B4 \uBAAC\uC2A4\uD130 \uD53C\uACA9 \uC2DC \uC720\uC800 \uB300\uBBF8\uC9C0 +23%" },
    { id: "spinal-stimulation", name: "\uCC99\uC218 \uC2E0\uACBD \uC790\uADF9\uC220", risk: "\uBCF4\uD1B5", bonus: 0.1, text: "\uBAAC\uC2A4\uD130 \uC0DD\uC131 \uC2DC \uACF5\uACA9/\uC2DC\uC804/\uC774\uB3D9\uC18D\uB3C4 +20" },
    { id: "leech-adsorption", name: "\uAC70\uBA38\uB9AC \uD761\uCC29 \uC694\uBC95", risk: "\uB0AE\uC74C", bonus: 0.05, text: "\uB178\uBA40 \uBAAC\uC2A4\uD130 \uC801\uC911 \uC2DC \uB9C8\uBE44 4\uCD08" },
    { id: "muscle-relaxant", name: "\uADFC\uC721 \uC774\uC644\uC81C \uC8FC\uC0AC \uC2E4\uD5D8", risk: "\uB0AE\uC74C", bonus: 0.05, text: "\uC720\uC800 \uCD5C\uB300 \uC911\uCCA9 \uAC10\uC18D \uC9C0\uC18D \uBD80\uC5EC" },
    { id: "anesthetic-analgesia", name: "\uB9C8\uCDE8 \uC9C4\uD1B5\uBC95", risk: "\uB0AE\uC74C", bonus: 0.05, text: "\uBAAC\uC2A4\uD130 \uC0DD\uC131 \uC2DC \uB300\uBBF8\uC9C0 \uAC10\uC18C +90% (2\uCD08)" },
    { id: "immune-suppression", name: "\uBA74\uC5ED \uC5B5\uC81C \uC2E4\uD5D8", risk: "\uB0AE\uC74C", bonus: 0.05, text: "\uC720\uC800 \uC544\uBA38/\uD68C\uD53C/\uBCF4\uD638\uB9C9 -20%" },
    { id: "sterile-isolation", name: "\uBB34\uADE0 \uACA9\uB9AC \uBCF4\uD638\uBC95", risk: "\uC5C6\uC74C", bonus: 0, text: "\uC720\uC800 \uD53C\uD574 -20%" },
    { id: "cardiopulmonary", name: "\uC2EC\uD3D0 \uC18C\uC0DD\uC220", risk: "\uC5C6\uC74C", bonus: 0, text: "\uCE58\uBA85\uC801 \uD53C\uACA9 \uC2DC 1\uD68C \uBD80\uD65C" },
    { id: "epidermal-graft", name: "\uD45C\uD53C \uC774\uC2DD \uC2E4\uD5D8", risk: "\uB0AE\uC74C", bonus: 0.05, text: "\uC720\uC800 \uD53C\uD574 +10%" },
    { id: "black-bile-treatment", name: "\uD751\uB2F4\uC999 \uCE58\uB8CC\uBC95", risk: "\uB0AE\uC74C", bonus: 0.05, text: "\uB9E4\uC9C1 \uBAAC\uC2A4\uD130 \uC801\uC911 \uC2DC \uC800\uC8FC \uBD80\uC5EC" }
  ];
  var toolById = (id) => {
    const found = tools.find((t) => t.id === id);
    if (!found) throw new Error(`\uC54C \uC218 \uC5C6\uB294 \uC218\uC220 \uB3C4\uAD6C: ${id}`);
    return found;
  };
  var potionById = (id) => {
    const found = potions.find((p) => p.id === id);
    if (!found) throw new Error(`\uC54C \uC218 \uC5C6\uB294 \uD3EC\uC158: ${id}`);
    return found;
  };
  var planById = (id) => {
    const found = plans.find((p) => p.id === id);
    if (!found) throw new Error(`\uC54C \uC218 \uC5C6\uB294 \uC218\uC220 \uD50C\uB79C: ${id}`);
    return found;
  };
  var boxById = (id) => {
    const found = potionBoxes.find((b) => b.id === id);
    if (!found) throw new Error(`\uC54C \uC218 \uC5C6\uB294 \uD3EC\uC158 \uC0C1\uC790: ${id}`);
    return found;
  };
  var isBoxId = (id) => potionBoxes.some((b) => b.id === id);

  // src/rng.ts
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, a | 1);
      t = t + Math.imul(t ^ t >>> 7, t | 61) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var pick = (rng, items) => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
  var shuffle = (rng, items) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  var weighted = (rng, weights) => {
    const entries = Object.entries(weights);
    let cursor = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [value, w] of entries) {
      cursor -= w;
      if (cursor < 0) return value;
    }
    return entries[entries.length - 1][0];
  };

  // src/effects.ts
  var MAX_TANK = 6;
  var randomRarity = (rng) => weighted(rng, monsterRarityWeights);
  var randomSpecies = (rng) => pick(rng, SPECIES);
  var nextId = (state) => `m${++state.idCounter}`;
  var totalOf = (m) => m.activity * m.quantity;
  var extreme = (state, direction, filter = () => true) => {
    const pool = state.monsters.filter(filter);
    if (!pool.length) return void 0;
    return [...pool].sort((a, b) => (direction === "high" ? totalOf(b) - totalOf(a) : totalOf(a) - totalOf(b)) || a.slot - b.slot)[0];
  };
  var find = (state, id) => state.monsters.find((m) => m.id === id);
  var index = (state, id) => state.monsters.findIndex((m) => m.id === id);
  var change = (state, id, patch) => {
    const i = index(state, id);
    if (i >= 0) state.monsters[i] = { ...state.monsters[i], ...patch };
  };
  var bumpAll = (state, activity, quantity, filter = () => true) => {
    state.monsters = state.monsters.map((m) => filter(m) ? { ...m, activity: m.activity + activity, quantity: m.quantity + quantity } : m);
  };
  var fireImmediate = (state, rng, event, payload, depth = 0) => {
    if (depth > 40) return;
    for (const owned of state.ownedTools) applyImmediateTool(state, rng, owned, event, payload, depth);
  };
  var applyImmediateTool = (state, rng, owned, event, payload, depth) => {
    const id = owned.toolId;
    if (event === "overflow" && id === "two-inch-skull-needle") {
      const chosen = extreme(state, "low");
      if (chosen) change(state, chosen.id, { activity: chosen.activity + 25, quantity: chosen.quantity + 25 });
    }
    if (event === "added" && id === "writhing-spine" && payload.id && rng() < 0.75) {
      const candidate = find(state, payload.id);
      if (candidate) mutateMonsters(state, rng, [{ id: candidate.id, species: "\uBCC0\uC774 \uC545\uB9C8", rarity: candidate.rarity }], depth + 1, { extraActivity: 80 });
    }
    if (event === "added" && id === "hatching-sac" && state.monsters.filter((m) => m.species === "\uB3C5\uCDA9").length >= 2) {
      bumpAll(state, 0, 45);
    }
    if (event === "removed" && id === "eyelid-retractor" && state.monsters.length) {
      const chosen = extreme(state, "high");
      if (chosen) change(state, chosen.id, { activity: chosen.activity + 20, quantity: chosen.quantity + 20 });
    }
    if (event === "removed" && id === "tangled-ulna" && state.monsters.filter((m) => m.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1").length >= 2 && state.monsters.length) {
      const chosen = pick(rng, state.monsters);
      change(state, chosen.id, { quantity: chosen.quantity + 180 });
    }
    if (event === "removed" && id === "shrunken-finger" && payload.removedSpecies !== "\uD574\uACE8 \uACBD\uBE44\uBCD1" && state.monsters.length) {
      const chosen = pick(rng, state.monsters);
      change(state, chosen.id, { quantity: chosen.quantity + 150 });
    }
    if (event === "mutated" && id === "stained-liver" && state.monsters.filter((m) => m.species === "\uBCC0\uC774 \uC545\uB9C8").length >= 2) {
      bumpAll(state, 20, 0);
    }
    if (event === "mutated" && id === "atypical-granuloma" && payload.becameMutant) {
      bumpAll(state, 35, 0);
    }
  };
  var makeMonster = (state, rng, species = randomSpecies(rng), rarity = randomRarity(rng), activityDelta = 0, quantityDelta = 0) => ({
    id: nextId(state),
    slot: -1,
    species,
    rarity,
    activity: initialStats[rarity].activity + activityDelta,
    quantity: initialStats[rarity].quantity + quantityDelta
  });
  var addMonster = (state, rng, monster, depth = 0) => {
    if (state.monsters.length >= MAX_TANK) {
      fireImmediate(state, rng, "overflow", {}, depth + 1);
      return null;
    }
    const occupied = new Set(state.monsters.map((m) => m.slot));
    const slot = Array.from({ length: MAX_TANK }, (_, i) => i).find((i) => !occupied.has(i));
    const placed = { ...monster, slot };
    state.monsters = [...state.monsters, placed].sort((a, b) => a.slot - b.slot);
    fireImmediate(state, rng, "added", { id: placed.id }, depth + 1);
    return placed;
  };
  var removeMonsters = (state, rng, ids, depth = 0) => {
    const idSet = new Set(ids);
    const removed = state.monsters.filter((m) => idSet.has(m.id));
    if (!removed.length) return [];
    state.monsters = state.monsters.filter((m) => !idSet.has(m.id));
    for (const m of removed) fireImmediate(state, rng, "removed", { id: m.id, removedSpecies: m.species }, depth + 1);
    return removed;
  };
  var removeMonster = (state, rng, id, depth = 0) => removeMonsters(state, rng, [id], depth)[0] ?? null;
  var mutateMonsters = (state, rng, targets, depth = 0, opts = {}) => {
    for (const t of targets) {
      const current = find(state, t.id);
      if (!current) continue;
      const species = t.species ?? randomSpecies(rng);
      const rarity = t.rarity ?? randomRarity(rng);
      const becameMutant = current.species !== "\uBCC0\uC774 \uC545\uB9C8" && species === "\uBCC0\uC774 \uC545\uB9C8";
      change(state, current.id, { species, rarity, activity: current.activity + (opts.extraActivity ?? 0) });
      fireImmediate(state, rng, "mutated", { id: current.id, becameMutant }, depth + 1);
    }
  };
  var mutateMonster = (state, rng, id, species, rarity, depth = 0) => mutateMonsters(state, rng, [{ id, species, rarity }], depth);
  var awakenTo = (state, id, rarity, levels = 1) => {
    const current = find(state, id);
    if (!current) return;
    const nextRarity = rarity ?? RARITIES[Math.min(3, RARITIES.indexOf(current.rarity) + levels)];
    if (nextRarity === current.rarity) return;
    const bonus = nextRarity === "\uB178\uBA40" ? 30 : nextRarity === "\uB9E4\uC9C1" ? 60 : 120;
    change(state, id, { rarity: nextRarity, activity: current.activity + bonus });
  };
  var fuse = (state, rng, ids, species, rarity, depth = 0) => {
    const materials = ids.map((id) => find(state, id)).filter((m) => Boolean(m));
    if (!materials.length) return null;
    const activity = materials.reduce((s, m) => s + m.activity, 0);
    const quantity = materials.reduce((s, m) => s + m.quantity, 0);
    removeMonsters(state, rng, materials.map((m) => m.id), depth);
    const resultSpecies = species ?? randomSpecies(rng);
    const resultRarity = rarity ?? randomRarity(rng);
    const result = makeMonster(state, rng, resultSpecies, resultRarity);
    result.activity = activity;
    result.quantity = quantity;
    return addMonster(state, rng, result, depth);
  };
  var consume = (state, rng, predatorId, preyId, depth = 0) => {
    const predator = find(state, predatorId);
    const prey = find(state, preyId);
    if (!predator || !prey || predator.id === prey.id) return;
    const stats = { activity: predator.activity + prey.activity, quantity: predator.quantity + prey.quantity };
    removeMonster(state, rng, prey.id, depth);
    change(state, predator.id, stats);
  };
  var due = (round, acquired, delay, interval) => round >= acquired + delay && (round - acquired - delay) % interval === 0;
  var applyRoundTool = (state, rng, owned) => {
    const id = owned.toolId;
    if (id === "sanctum-madonna" && due(state.round, owned.acquiredRound, 2, 2)) {
      const targets = ["\uB178\uBA40", "\uB9E4\uC9C1", "\uB808\uC5B4"].flatMap((rarity) => {
        const pool = state.monsters.filter((m) => m.rarity === rarity);
        return pool.length ? [pick(rng, pool).id] : [];
      });
      for (const targetId of targets) awakenTo(state, targetId);
    }
    if (id === "canine-rasp") {
      for (const m of state.monsters.filter((m2) => m2.activity > 255)) change(state, m.id, { quantity: m.quantity + 30 });
    }
    if (id === "rawhide-restraint" && state.monsters.filter((m) => m.rarity === "\uB9E4\uC9C1").length >= 3) {
      const chosen = extreme(state, "high");
      if (chosen) change(state, chosen.id, { quantity: chosen.quantity + 100 });
    }
    if (id === "dirty-knife") {
      for (const m of state.monsters.filter((m2) => m2.quantity > 275)) change(state, m.id, { activity: m.activity + 20 });
    }
    if (id === "tanned-restraint" && state.monsters.some((m) => m.rarity === "\uB178\uBA40") && state.monsters.some((m) => m.rarity === "\uB9E4\uC9C1") && state.monsters.some((m) => m.rarity === "\uB808\uC5B4" || m.rarity === "\uBCF4\uC2A4")) {
      bumpAll(state, 20, 0);
    }
    if (id === "iron-bonesaw") {
      for (const m of state.monsters.filter((m2) => m2.activity > 150 && m2.quantity > 150)) change(state, m.id, { activity: m.activity + 15, quantity: m.quantity + 15 });
    }
    if (id === "insect-egg-cluster" && state.monsters.filter((m) => m.species === "\uB3C5\uCDA9").length >= 3) {
      addMonster(state, rng, makeMonster(state, rng, "\uB3C5\uCDA9", randomRarity(rng), 0, 100));
    }
    if (id === "bloated-pituitary" && state.monsters.some((m) => m.species === "\uAC01\uC131\uCCB4" && (m.rarity === "\uB808\uC5B4" || m.rarity === "\uBCF4\uC2A4"))) {
      const chosen = pick(rng, state.monsters);
      change(state, chosen.id, { activity: chosen.activity + 80 });
    }
    if (id === "nettle-knot" && state.monsters.filter((m) => m.rarity === "\uB178\uBA40").length >= 3) {
      bumpAll(state, 0, 30);
    }
    if (id === "atypical-needle" && due(state.round, owned.acquiredRound, 3, 3)) {
      mutateMonsters(state, rng, state.monsters.map((m) => ({ id: m.id })));
    }
    if (id === "human-pupa") {
      const count = state.monsters.filter((m) => m.species === "\uB3C5\uCDA9").length;
      const repeats = count * (count + 1) / 2;
      for (let i = 0; i < repeats && state.monsters.length; i++) {
        const amount = rng() < 0.5 ? 1 : Math.min(2, state.monsters.length);
        for (const m of shuffle(rng, state.monsters).slice(0, amount)) change(state, m.id, { quantity: m.quantity + 8 });
      }
    }
    if (id === "proliferated-frontal" && state.monsters.filter((m) => m.species === "\uAC01\uC131\uCCB4").length >= 2) {
      const pool = state.monsters.filter((m) => m.rarity === "\uB808\uC5B4" || m.rarity === "\uBCF4\uC2A4");
      if (pool.length) {
        const chosen = pick(rng, pool);
        change(state, chosen.id, { activity: chosen.activity + 80 });
      }
    }
    if (id === "molting-cortex") {
      const pool = state.monsters.filter((m) => m.rarity === "\uB9E4\uC9C1");
      if (pool.length >= 2) fuse(state, rng, shuffle(rng, pool).slice(0, 2).map((m) => m.id), "\uAC01\uC131\uCCB4", "\uB808\uC5B4");
    }
    if (id === "twice-bone-beak") {
      if (state.monsters.length >= 2 && state.monsters.length <= 5) addMonster(state, rng, makeMonster(state, rng));
      else if (state.monsters.length === 6) {
        const high = extreme(state, "high");
        const low = high ? extreme(state, "low", (m) => m.id !== high.id) : void 0;
        if (high && low) consume(state, rng, high.id, low.id);
      }
    }
    if (id === "brooding-butterfly" && due(state.round, owned.acquiredRound, 3, 3)) {
      const pool = state.monsters.filter((m) => m.species === "\uB3C5\uCDA9");
      if (pool.length >= 2) fuse(state, rng, shuffle(rng, pool).slice(0, 2).map((m) => m.id), "\uB3C5\uCDA9");
    }
    if (id === "tendon-crushing-rope" && state.monsters.filter((m) => m.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1").length >= 2) {
      const prey = extreme(state, "low", (m) => m.species !== "\uD574\uACE8 \uACBD\uBE44\uBCD1");
      const skeletons = state.monsters.filter((m) => m.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1");
      if (prey && skeletons.length) {
        const stats = { activity: prey.activity, quantity: prey.quantity };
        const chosen = pick(rng, skeletons);
        removeMonster(state, rng, prey.id);
        const current = find(state, chosen.id);
        if (current) change(state, chosen.id, { activity: current.activity + stats.activity, quantity: current.quantity + stats.quantity });
      }
    }
    if (id === "black-goat-gut") {
      const snapshot = [...state.monsters];
      const groups = [];
      for (const rarity of ["\uB178\uBA40", "\uB9E4\uC9C1", "\uB808\uC5B4"]) {
        const pool = snapshot.filter((m) => m.rarity === rarity);
        for (let i = 0; i + 2 < pool.length; i += 3) groups.push(pool.slice(i, i + 3));
      }
      for (const group of groups) fuse(state, rng, group.map((m) => m.id), void 0, RARITIES[RARITIES.indexOf(group[0].rarity) + 1]);
    }
  };
  var applyRoundTools = (state, rng) => {
    for (const owned of state.ownedTools) applyRoundTool(state, rng, owned);
  };
  var applyPotion = (state, rng, potion, targetIds) => {
    const selected = targetIds.map((id) => find(state, id)).filter((m) => Boolean(m));
    const add = (species, rarity, activity = 0, quantity = 0) => addMonster(state, rng, makeMonster(state, rng, species, rarity, activity, quantity));
    const randomGroup = () => state.monsters.length ? pick(rng, state.monsters) : void 0;
    const randomOther = (predicate) => {
      const pool = state.monsters.filter(predicate);
      return pool.length ? pick(rng, pool) : void 0;
    };
    switch (potion.id) {
      case "micromelia-skeleton":
        add("\uD574\uACE8 \uACBD\uBE44\uBCD1", void 0, 0, 73);
        break;
      case "micromelia-insect":
        add("\uB3C5\uCDA9", void 0, 0, 73);
        break;
      case "insect-attractant": {
        let overflowCount = 0;
        for (let i = 0; i < 4; i++) if (!add("\uB3C5\uCDA9")) overflowCount++;
        for (let i = 0; i < overflowCount; i++) bumpAll(state, 10, 15);
        break;
      }
      case "anesthetic-mutant": {
        mutateMonster(state, rng, selected[0].id, "\uBCC0\uC774 \uC545\uB9C8", selected[0].rarity);
        if (rng() < 0.5) {
          const other = randomOther((m) => m.id !== selected[0].id);
          if (other) mutateMonster(state, rng, other.id, "\uBCC0\uC774 \uC545\uB9C8", other.rarity);
        }
        break;
      }
      case "anesthetic-awakened":
        mutateMonster(state, rng, selected[0].id, "\uAC01\uC131\uCCB4", selected[0].rarity);
        awakenTo(state, selected[0].id, "\uB9E4\uC9C1");
        break;
      case "heterogeneous-hormone":
        removeMonsters(state, rng, selected.map((m) => m.id));
        for (let i = 0; i < 4; i++) add(void 0, void 0, 5);
        break;
      case "twin-insect": {
        const chosen = selected[0];
        mutateMonster(state, rng, chosen.id, "\uB3C5\uCDA9", chosen.rarity);
        const current = find(state, chosen.id);
        if (current) addMonster(state, rng, makeMonster(state, rng, current.species, current.rarity));
        break;
      }
      case "twin-skeleton": {
        const chosen = selected[0];
        mutateMonster(state, rng, chosen.id, "\uD574\uACE8 \uACBD\uBE44\uBCD1", chosen.rarity);
        const current = find(state, chosen.id);
        if (current) change(state, current.id, { quantity: current.quantity + 62 });
        break;
      }
      case "spinal-awakened":
        add("\uAC01\uC131\uCCB4", void 0, 31);
        break;
      case "spinal-mutant":
        add("\uBCC0\uC774 \uC545\uB9C8", void 0, 31);
        break;
      case "targeted-hormone":
        removeMonster(state, rng, selected[0].id);
        add(randomSpecies(rng), "\uB9E4\uC9C1", 0, 25);
        add(randomSpecies(rng), "\uB9E4\uC9C1", 0, 25);
        break;
      case "strong-removal-powder": {
        const chosen = selected[0];
        change(state, chosen.id, { quantity: chosen.quantity + 154 });
        const removals = shuffle(rng, state.monsters.filter((m) => m.id !== chosen.id && m.species !== chosen.species)).slice(0, 2);
        removeMonsters(state, rng, removals.map((m) => m.id));
        break;
      }
      case "sticky-bile": {
        const chosen = selected[0];
        const right = state.monsters[index(state, chosen.id) + 1];
        change(state, chosen.id, { activity: chosen.activity + 31 });
        if (right) {
          mutateMonster(state, rng, right.id, chosen.species, chosen.rarity);
          const current = find(state, right.id);
          if (current) change(state, right.id, { activity: current.activity + 31 });
        }
        break;
      }
      case "hollow-spine": {
        const chosen = selected[0];
        change(state, chosen.id, { activity: chosen.activity + 41 });
        if (rng() < 0.5) mutateMonster(state, rng, chosen.id, "\uBCC0\uC774 \uC545\uB9C8", chosen.rarity);
        break;
      }
      case "eggshell-powder": {
        const chosen = randomGroup();
        if (chosen) {
          change(state, chosen.id, { quantity: chosen.quantity + 25 });
          if (chosen.species === "\uB3C5\uCDA9") add(chosen.species, chosen.rarity, 0, 25);
        }
        break;
      }
      case "unmixed-tincture":
        awakenTo(state, selected[0].id);
        break;
      case "breeding-powder": {
        const chosen = [];
        for (const rarity of RARITIES) {
          const pool = state.monsters.filter((m) => m.rarity === rarity);
          if (pool.length) chosen.push(pick(rng, pool));
        }
        for (const m of chosen.slice(0, 4)) change(state, m.id, { quantity: m.quantity + 32 });
        break;
      }
      case "mutation-powder": {
        for (const item of selected) {
          const current = find(state, item.id);
          if (current) change(state, item.id, { quantity: current.quantity + 52 });
        }
        mutateMonsters(state, rng, selected.map((item) => ({ id: item.id, species: randomSpecies(rng), rarity: "\uB808\uC5B4" })));
        break;
      }
      case "brainfog-tincture": {
        const chosen = randomGroup();
        if (chosen) {
          change(state, chosen.id, { activity: chosen.activity + 41 });
          if (chosen.species === "\uAC01\uC131\uCCB4") awakenTo(state, chosen.id, "\uB808\uC5B4");
        }
        break;
      }
      case "raw-bone-powder": {
        const chosen = randomGroup();
        if (chosen) {
          change(state, chosen.id, { quantity: chosen.quantity + 40 });
          if (chosen.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1") {
            const current = find(state, chosen.id);
            if (current) change(state, chosen.id, { quantity: current.quantity + 127 });
            const other = randomOther((m) => m.species !== "\uD574\uACE8 \uACBD\uBE44\uBCD1");
            if (other) removeMonster(state, rng, other.id);
          }
        }
        break;
      }
      case "digestive-enzyme": {
        const chosen = selected[0];
        const left = state.monsters[index(state, chosen.id) - 1];
        change(state, chosen.id, { activity: chosen.activity + 61 });
        if (left) removeMonster(state, rng, left.id);
        break;
      }
      case "pure-leech": {
        const chosen = selected[0];
        const pool = [chosen, ...shuffle(rng, state.monsters.filter((m) => m.id !== chosen.id && m.species === chosen.species))].slice(0, 2);
        for (const m of pool) change(state, m.id, { activity: m.activity + 31 });
        break;
      }
      case "removal-powder": {
        const chosen = selected[0];
        change(state, chosen.id, { quantity: chosen.quantity + 127 });
        const other = randomOther((m) => m.id !== chosen.id && m.species !== chosen.species);
        if (other) removeMonster(state, rng, other.id);
        break;
      }
      case "blue-bile": {
        mutateMonsters(state, rng, selected.map((item) => ({ id: item.id, species: randomSpecies(rng), rarity: "\uB9E4\uC9C1" })));
        for (const item of selected) {
          const current = find(state, item.id);
          if (current) change(state, item.id, { activity: current.activity + 31 });
        }
        break;
      }
      case "mixed-leech": {
        const chosen = selected[0];
        const pool = [chosen, ...shuffle(rng, state.monsters.filter((m) => m.id !== chosen.id && m.rarity === chosen.rarity))].slice(0, 2);
        for (const m of pool) change(state, m.id, { activity: m.activity + 31 });
        break;
      }
      case "active-growth-hormone":
        add("\uB3C5\uCDA9");
        if (rng() < 0.5) {
          add("\uB3C5\uCDA9");
          add("\uB3C5\uCDA9");
        }
        break;
      case "gray-spine": {
        const chosen = randomGroup();
        if (chosen) {
          change(state, chosen.id, { activity: chosen.activity + 41 });
          mutateMonster(state, rng, chosen.id);
          if (rng() < 0.5) {
            const current = find(state, chosen.id);
            if (current) {
              mutateMonster(state, rng, chosen.id, "\uBCC0\uC774 \uC545\uB9C8", current.rarity);
              const after = find(state, chosen.id);
              if (after) change(state, chosen.id, { activity: after.activity + 30 });
            }
          }
        }
        break;
      }
      case "petrified-spine": {
        const chosen = selected[0];
        change(state, chosen.id, { activity: chosen.activity + 20 });
        if (chosen.species !== "\uBCC0\uC774 \uC545\uB9C8") {
          mutateMonster(state, rng, chosen.id, "\uBCC0\uC774 \uC545\uB9C8", chosen.rarity);
          const current = find(state, chosen.id);
          if (current) change(state, chosen.id, { activity: current.activity + 30 });
        }
        break;
      }
      case "meningeal-solution": {
        const chosen = selected[0];
        const times = chosen.species === "\uAC01\uC131\uCCB4" && chosen.rarity === "\uB9E4\uC9C1" ? 2 : chosen.species === "\uAC01\uC131\uCCB4" && (chosen.rarity === "\uB808\uC5B4" || chosen.rarity === "\uBCF4\uC2A4") ? 3 : 1;
        change(state, chosen.id, { activity: chosen.activity + 30 * times });
        break;
      }
      case "boil-ointment": {
        const chosen = selected[0];
        const right = state.monsters[index(state, chosen.id) + 1];
        change(state, chosen.id, { activity: chosen.activity + 20, quantity: chosen.quantity + (chosen.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1" ? 41 : 0) });
        if (chosen.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1" && right) removeMonster(state, rng, right.id);
        break;
      }
      case "probiotic-enzyme": {
        const count = state.monsters.filter((m) => m.species === "\uB3C5\uCDA9").length;
        for (let i = 0; i < count; i++) bumpAll(state, 11, 0, (m) => m.species === "\uB3C5\uCDA9");
        break;
      }
      case "molting-solution":
        fuse(state, rng, selected.map((m) => m.id), "\uB3C5\uCDA9");
        break;
      case "ossification-ointment": {
        if (state.monsters.some((m) => m.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1")) {
          const pool = shuffle(rng, state.monsters.filter((m) => m.species !== "\uD574\uACE8 \uACBD\uBE44\uBCD1")).slice(0, 3);
          removeMonsters(state, rng, pool.map((m) => m.id));
          for (let i = 0; i < pool.length; i++) bumpAll(state, 28, 28);
        }
        break;
      }
      case "active-spine-powder": {
        const pool = shuffle(rng, state.monsters.filter((m) => m.species !== "\uBCC0\uC774 \uC545\uB9C8")).slice(0, 3);
        for (const item of pool) {
          mutateMonster(state, rng, item.id, "\uBCC0\uC774 \uC545\uB9C8", item.rarity);
          const mutants = shuffle(rng, state.monsters.filter((m) => m.species === "\uBCC0\uC774 \uC545\uB9C8")).slice(0, 3);
          for (const m of mutants) change(state, m.id, { quantity: m.quantity + 42 });
        }
        break;
      }
      case "infected-zone-dressing": {
        if (state.monsters.some((m) => m.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1")) {
          const removed = state.monsters.filter((m) => m.species !== "\uD574\uACE8 \uACBD\uBE44\uBCD1");
          removeMonsters(state, rng, removed.map((m) => m.id));
          for (let i = 0; i < removed.length; i++) bumpAll(state, 20, 39, (m) => m.species === "\uD574\uACE8 \uACBD\uBE44\uBCD1");
        }
        break;
      }
      case "compound-vitality-pill": {
        const ids = state.monsters.map((m) => m.id);
        for (const id of ids) {
          const rarity = randomRarity(rng);
          mutateMonster(state, rng, id, "\uBCC0\uC774 \uC545\uB9C8", rarity);
          const current = find(state, id);
          if (!current) continue;
          const activityBonus = 11 + (rarity === "\uB9E4\uC9C1" ? 11 : 0);
          change(state, id, { activity: current.activity + activityBonus });
          if (rarity === "\uB808\uC5B4" || rarity === "\uBCF4\uC2A4") {
            const afterActivity = find(state, id);
            if (afterActivity) change(state, id, { quantity: afterActivity.quantity + 11 });
          }
        }
        break;
      }
      case "ritual-recovery-salt": {
        const chosen = randomGroup();
        if (chosen) change(state, chosen.id, { activity: chosen.activity + 111, quantity: chosen.quantity + 111 });
        break;
      }
    }
  };
  var reachedNewThresholds = (state, thresholds) => thresholds.filter((v) => state.monsters.reduce((s, m) => s + m.activity * m.quantity, 0) >= v && !state.claimedThresholds.includes(v));

  // src/offers.ts
  var drawUniqueIds = (rng, pool, count, excluded = []) => shuffle(rng, pool.filter((item) => !excluded.includes(item.id))).slice(0, count).map((item) => item.id);
  var drawToolChoices = (rng, timing, count = 3, excluded = []) => drawUniqueIds(rng, tools.filter((t) => t.timing === timing), count, excluded);
  var drawPlanChoices = (rng, count = 3, excluded = []) => drawUniqueIds(rng, plans, count, excluded);
  var drawPotionChoices = (rng, difficulty, count = 3, excluded = [], weights = difficultyPotionTierWeights[difficulty], includeBoxes = true) => {
    const result = [];
    let guard = 0;
    while (result.length < count && guard++ < 200) {
      const tier = weighted(rng, weights);
      const pool = [...potions.filter((p) => p.tier === tier), ...includeBoxes && tier === "\uB808\uC5B4" ? potionBoxes : []];
      const candidate = pick(rng, pool).id;
      if (!result.includes(candidate) && !excluded.includes(candidate)) result.push(candidate);
    }
    return result;
  };
  var drawBoxContents = (rng, difficulty, size, rareWeighted) => drawPotionChoices(rng, difficulty, size, [], rareWeighted ? rareBoxWeights : difficultyPotionTierWeights[difficulty], false);

  // src/scoring.ts
  var totalActivity = (monsters) => monsters.reduce((sum, m) => sum + m.activity * m.quantity, 0);
  var FINAL_ACTIVITY_WEIGHTS = [0.2, 0.3, 0.5];
  var calculateFinalActivity = (stageActivities, planBonuses) => Math.round(
    FINAL_ACTIVITY_WEIGHTS.reduce((sum, weight, index2) => {
      const cumulativeBonus = planBonuses.slice(0, index2 + 1).reduce((bonus, value) => bonus + value, 0);
      return sum + (stageActivities[index2] ?? 0) * weight * (1 + cumulativeBonus);
    }, 0)
  );

  // src/search.ts
  var defaultSearchOptions = (difficulty) => ({
    difficulty,
    depth: 4,
    rolloutsRoot: 20,
    beamWidth: 2,
    riskAversion: 0,
    rng: void 0
  });
  var cloneState = (state) => ({
    ...state,
    monsters: state.monsters.map((m) => ({ ...m })),
    ownedTools: state.ownedTools.map((t) => ({ ...t })),
    plansChosen: [...state.plansChosen],
    claimedThresholds: [...state.claimedThresholds],
    snapshots: [...state.snapshots],
    pendingBoxChoices: state.pendingBoxChoices ? [...state.pendingBoxChoices] : void 0,
    rerolls: { ...state.rerolls }
  });
  var mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  var stddev = (xs, m) => Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  var percentile = (xs, p) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  };
  var successProbOf = (samples, threshold) => threshold === void 0 ? void 0 : samples.filter((v) => v >= threshold).length / samples.length;
  var heuristicValue = (state) => {
    const bonusesSoFar = state.plansChosen.map((id) => planById(id).bonus);
    if (state.snapshots.length >= 3) return calculateFinalActivity(state.snapshots, bonusesSoFar);
    const activityNow = totalActivity(state.monsters);
    const stageActivities = [0, 1, 2].map((i) => state.snapshots[i] ?? activityNow);
    const bonuses = [0, 1, 2].map((i) => bonusesSoFar[i] ?? 0);
    return calculateFinalActivity(stageActivities, bonuses);
  };
  var targetCandidates = (state, target2) => {
    if (!target2) return [[]];
    const eligible = state.monsters.filter((m) => (!target2.species || m.species === target2.species) && (!target2.excludeSpecies || m.species !== target2.excludeSpecies));
    if (!eligible.length) return [];
    const byTotal = [...eligible].sort((a, b) => b.activity * b.quantity - a.activity * a.quantity);
    const singles = target2.min <= 1 ? eligible.map((m) => [m.id]) : [];
    if (target2.max <= 1) return singles;
    const pairs = /* @__PURE__ */ new Set();
    const combos = [];
    const tryPair = (a, b) => {
      if (a === b) return;
      const key = [a, b].sort().join(",");
      if (pairs.has(key)) return;
      pairs.add(key);
      combos.push([a, b]);
    };
    if (byTotal.length >= 2) {
      tryPair(byTotal[0].id, byTotal[1].id);
      tryPair(byTotal.at(-1).id, byTotal.at(-2).id);
      tryPair(byTotal[0].id, byTotal.at(-1).id);
    }
    return [...singles, ...combos];
  };
  var expandPotionChoice = (state, potionId, forcedTargetIds) => {
    const potion = potionById(potionId);
    if (forcedTargetIds?.length) return [{ kind: "potion", potionId, targetIds: forcedTargetIds }];
    return targetCandidates(state, potion.target).map((targetIds) => ({ kind: "potion", potionId, targetIds }));
  };
  var toActions = (state, choice) => {
    if (choice.kind === "tool") return [{ kind: "tool", toolId: choice.id }];
    if (choice.kind === "plan") return [{ kind: "plan", planId: choice.id }];
    if (choice.kind === "box") return [{ kind: "box", boxId: choice.id }];
    return expandPotionChoice(state, choice.id, choice.targetIds);
  };
  var generateOfferedActions = (state, rng) => {
    if (state.phase === "tool") return drawToolChoices(rng, state.toolSelection).map((id) => ({ kind: "tool", toolId: id }));
    if (state.phase === "plan") return drawPlanChoices(rng, 3, state.plansChosen).map((id) => ({ kind: "plan", planId: id }));
    if (state.phase === "potion") return drawPotionChoices(rng, state.difficulty).flatMap((id) => isBoxId(id) ? [{ kind: "box", boxId: id }] : expandPotionChoice(state, id));
    if (state.phase === "box") return (state.pendingBoxChoices ?? []).flatMap((id) => expandPotionChoice(state, id));
    return [];
  };
  var applyAction = (state, rng, action) => {
    if (action.kind === "tool") {
      state.ownedTools.push({ toolId: action.toolId, acquiredRound: state.round });
      state.pendingToolSelections -= 1;
      if (state.pendingToolSelections > 0) return;
      const wasBonusPick = state.toolSelection === "general";
      state.toolSelection = "general";
      if (wasBonusPick) state.round += 1;
      state.phase = state.round <= 10 ? "potion" : "plan";
      return;
    }
    if (action.kind === "box") {
      const box = boxById(action.boxId);
      state.pendingBoxChoices = drawBoxContents(rng, state.difficulty, box.size, box.rareWeighted);
      state.phase = "box";
      return;
    }
    if (action.kind === "potion") {
      applyPotion(state, rng, potionById(action.potionId), action.targetIds);
      applyRoundTools(state, rng);
      const reached = reachedNewThresholds(state, TOOL_THRESHOLDS);
      if (reached.length) {
        state.claimedThresholds.push(...reached);
        state.pendingToolSelections = reached.length;
        state.toolSelection = "general";
        state.phase = "tool";
      } else if (state.round === 10) {
        state.round = 11;
        state.phase = "plan";
      } else {
        state.round += 1;
        state.phase = "potion";
      }
      return;
    }
    if (action.kind === "plan") {
      state.plansChosen.push(action.planId);
      applyRoundTools(state, rng);
      state.snapshots.push(totalActivity(state.monsters));
      if (state.round === 13) state.phase = "complete";
      else state.round += 1;
      return;
    }
    if (action.kind === "reroll") throw new Error("reroll\uC740 applyAction\uC73C\uB85C \uC801\uC6A9\uD558\uC9C0 \uC54A\uB294\uB2E4 \u2014 evaluateReroll\uC774 recommend() \uB8E8\uD2B8\uC5D0\uC11C\uB9CC \uC9C1\uC811 \uD3C9\uAC00\uD55C\uB2E4.");
  };
  var greedyPeek = (state, rng, action) => {
    const s2 = cloneState(state);
    applyAction(s2, rng, action);
    if (action.kind !== "box") return heuristicValue(s2);
    const contents = generateOfferedActions(s2, rng);
    if (!contents.length) return heuristicValue(s2);
    let best = -Infinity;
    for (const inner of contents) {
      const s3 = cloneState(s2);
      applyAction(s3, rng, inner);
      best = Math.max(best, heuristicValue(s3));
    }
    return best;
  };
  var nextDepthAfter = (action, depth) => action.kind === "box" ? depth : depth - 1;
  var simulateForward = (state, rng, opts, depth) => {
    if (state.phase === "complete" || depth <= 0) return heuristicValue(state);
    let candidates = generateOfferedActions(state, rng);
    if (!candidates.length) return heuristicValue(state);
    if (candidates.length > opts.beamWidth) {
      candidates = candidates.map((action) => ({ action, peek: greedyPeek(state, rng, action) })).sort((a, b) => b.peek - a.peek).slice(0, opts.beamWidth).map((c) => c.action);
    }
    let best = -Infinity;
    for (const action of candidates) {
      const s2 = cloneState(state);
      applyAction(s2, rng, action);
      const val = simulateForward(s2, rng, opts, nextDepthAfter(action, depth));
      if (val > best) best = val;
    }
    return best;
  };
  var rerollTargetFor = (phase) => {
    if (phase === "tool") return "tool";
    if (phase === "potion" || phase === "box") return "potion";
    return null;
  };
  var drawRerollOffer = (state, rng, target2, excludedIds) => {
    if (target2 === "tool") return drawToolChoices(rng, state.toolSelection, 3, excludedIds).map((id) => ({ kind: "tool", toolId: id }));
    return drawPotionChoices(rng, state.difficulty, 3, excludedIds).flatMap((id) => isBoxId(id) ? [{ kind: "box", boxId: id }] : expandPotionChoice(state, id));
  };
  var evaluateReroll = (state, rng, opts, target2, excludedIds, before) => {
    const samples = [];
    for (let i = 0; i < opts.rolloutsRoot; i++) {
      let newActions = drawRerollOffer(state, rng, target2, excludedIds);
      if (!newActions.length) {
        samples.push(heuristicValue(state));
        continue;
      }
      if (newActions.length > opts.beamWidth) {
        newActions = newActions.map((action2) => ({ action: action2, peek: greedyPeek(state, rng, action2) })).sort((a, b) => b.peek - a.peek).slice(0, opts.beamWidth).map((c) => c.action);
      }
      let best = -Infinity;
      for (const action2 of newActions) {
        const s2 = cloneState(state);
        applyAction(s2, rng, action2);
        const val = simulateForward(s2, rng, opts, nextDepthAfter(action2, opts.depth));
        if (val > best) best = val;
      }
      samples.push(best);
    }
    const expected = mean(samples);
    const stdev = stddev(samples, expected);
    const action = { kind: "reroll", target: target2 };
    return { action, label: labelFor(action), expected, stdev, p10: percentile(samples, 0.1), p90: percentile(samples, 0.9), successProb: successProbOf(samples, opts.targetThreshold), immediateActivity: totalActivity(state.monsters), note: `\uB9AC\uB864 \uD6C4 \uC608\uC0C1 \uCD5C\uC885 \uD65C\uC131 \uBCC0\uD654 ${expected - before >= 0 ? "+" : ""}${Math.round(expected - before).toLocaleString("ko-KR")}` };
  };
  var recommend = (source, offeredChoices, options2) => {
    const opts = { ...defaultSearchOptions(options2.difficulty), ...options2 };
    const rng = opts.rng ?? mulberry32((Date.now() ^ Math.random() * 4294967295) >>> 0);
    const state = { ...source, difficulty: opts.difficulty };
    const rootActions = offeredChoices ? offeredChoices.flatMap((choice) => toActions(state, choice)) : generateOfferedActions(state, rng);
    if (state.phase === "plan") {
      const currentActivity = totalActivity(state.monsters);
      return rootActions.filter((a) => a.kind === "plan").map((action) => {
        const bonus = planById(action.planId).bonus;
        return {
          action,
          label: labelFor(action),
          expected: currentActivity,
          stdev: 0,
          p10: currentActivity,
          p90: currentActivity,
          immediateActivity: currentActivity,
          note: `\uBCF4\uB108\uC2A4 +${Math.round(bonus * 100)}% (\uD65C\uC131 \uADA4\uC801\uACFC \uBB34\uAD00\uD558\uAC8C \uC81C\uC2DC\uB41C \uCE74\uB4DC \uC911 \uBCF4\uB108\uC2A4 \uCD5C\uB313\uAC12\uC774 \uD56D\uC0C1 \uCD5C\uC120 \u2014 \uAE30\uB300\uAC12\uC740 \uCC38\uACE0\uC6A9 \uD604\uC7AC \uCD1D\uD65C\uC131\uC77C \uBFD0 \uCD5C\uC885\uC810\uC218 \uC608\uCE21 \uC544\uB2D8)`
        };
      }).sort((a, b) => planById(b.action.planId).bonus - planById(a.action.planId).bonus);
    }
    const before = heuristicValue(state);
    const results = rootActions.map((action) => {
      const samples = [];
      const immediateSamples = [];
      for (let i = 0; i < opts.rolloutsRoot; i++) {
        const s2 = cloneState(state);
        applyAction(s2, rng, action);
        immediateSamples.push(totalActivity(s2.monsters));
        samples.push(simulateForward(s2, rng, opts, nextDepthAfter(action, opts.depth)));
      }
      const expected = mean(samples);
      const stdev = stddev(samples, expected);
      const immediateActivity = mean(immediateSamples);
      return { action, label: labelFor(action), expected, stdev, p10: percentile(samples, 0.1), p90: percentile(samples, 0.9), successProb: successProbOf(samples, opts.targetThreshold), immediateActivity, note: `\uC989\uC2DC \uD6A8\uACFC \uD6C4 \uC608\uC0C1 \uCD5C\uC885 \uD65C\uC131 \uBCC0\uD654 ${expected - before >= 0 ? "+" : ""}${Math.round(expected - before).toLocaleString("ko-KR")}` };
    });
    const rerollTarget = offeredChoices ? rerollTargetFor(state.phase) : null;
    if (rerollTarget && state.rerolls[rerollTarget] > 0) {
      const excludedIds = offeredChoices.map((choice) => choice.id);
      results.push(evaluateReroll(state, rng, opts, rerollTarget, excludedIds, before));
    }
    if (opts.targetThreshold !== void 0) {
      return results.sort((a, b) => b.successProb - a.successProb || b.expected - a.expected);
    }
    const riskAversion = opts.riskAversion ?? 0;
    const rankScore = (c) => c.expected - riskAversion * c.stdev;
    return results.sort((a, b) => rankScore(b) - rankScore(a));
  };
  var labelFor = (action) => {
    if (action.kind === "tool") return `[\uB3C4\uAD6C] ${toolById(action.toolId).name}`;
    if (action.kind === "plan") return `[\uD50C\uB79C] ${planById(action.planId).name}`;
    if (action.kind === "box") return `[\uD3EC\uC158 \uC0C1\uC790] ${boxById(action.boxId).name} \uC5F4\uAE30`;
    if (action.kind === "reroll") return `[\uB9AC\uB864] ${action.target === "tool" ? "\uC218\uC220\uB3C4\uAD6C" : "\uD3EC\uC158"} \uC120\uD0DD\uC9C0 \uB2E4\uC2DC \uBF51\uAE30`;
    const potion = potionById(action.potionId);
    return `[\uD3EC\uC158] ${potion.name}${action.targetIds.length ? ` \u2192 \uB300\uC0C1 ${action.targetIds.length}\uADF8\uB8F9` : ""}`;
  };

  // src/lookup.ts
  var toolIdByName = new Map(tools.map((t) => [t.name, t.id]));
  var potionIdByName = new Map(potions.map((p) => [p.name, p.id]));
  var planIdByName = new Map(plans.map((p) => [p.name, p.id]));
  var speciesByNameAndRarity = (name, rarity) => {
    for (const species of Object.keys(monsterNames)) {
      if (monsterNames[species][rarity].includes(name)) return species;
    }
    return void 0;
  };

  // src/browser/domReader.ts
  var RARITY_SET = /* @__PURE__ */ new Set(["\uB178\uBA40", "\uB9E4\uC9C1", "\uB808\uC5B4", "\uBCF4\uC2A4"]);
  var rarityOf = (el) => {
    for (const c of Array.from(el.classList)) {
      if (c.startsWith("rarity-") && RARITY_SET.has(c.slice(7))) return c.slice(7);
    }
    return void 0;
  };
  var readMonsters = () => {
    const tanks = Array.from(document.querySelectorAll(".tank"));
    const monsters = [];
    tanks.forEach((tank, slot) => {
      if (tank.classList.contains("empty")) return;
      const rarity = rarityOf(tank);
      const name = tank.querySelector(".tank-name b")?.textContent?.trim();
      const numbers = Array.from(tank.querySelectorAll(".tank-stat:not(.total-activity) .tank-stat-number")).map((n) => Number((n.textContent ?? "").replace(/,/g, "")));
      if (!rarity || !name || numbers.length < 2 || Number.isNaN(numbers[0]) || Number.isNaN(numbers[1])) return;
      const species = speciesByNameAndRarity(name, rarity);
      if (!species) return;
      monsters.push({ id: `dom-${slot}`, slot, species, rarity, activity: numbers[0], quantity: numbers[1] });
    });
    return monsters;
  };
  var isLogPanelOpen = () => document.querySelector(".log-entry") !== null;
  var readOwnedTools = () => {
    const names = Array.from(document.querySelectorAll(".tool-slot.filled .tool-tooltip b")).map((el) => el.textContent?.trim()).filter((n) => Boolean(n));
    const roundByName = /* @__PURE__ */ new Map();
    if (isLogPanelOpen()) {
      for (const entry of document.querySelectorAll(".log-entry.log-tool")) {
        const roundText = entry.querySelector(".log-meta span")?.textContent?.trim();
        const heading = entry.querySelector(".log-entry-heading strong")?.textContent?.trim();
        const round = roundText ? Number(roundText.replace(/^R0*/, "")) : NaN;
        const name = heading?.replace(/\s*획득$/, "");
        if (name && Number.isFinite(round)) roundByName.set(name, [...roundByName.get(name) ?? [], round]);
      }
    }
    return names.map((name) => {
      const toolId = toolIdByName.get(name);
      const acquiredRound = roundByName.get(name)?.shift() ?? 1;
      return toolId ? { toolId, acquiredRound } : null;
    }).filter((t) => t !== null);
  };
  var readRound = () => {
    const label = document.querySelector(".mobile-round")?.getAttribute("aria-label") ?? document.querySelector(".round-value")?.textContent ?? "";
    const m = /(\d+)\s*\/\s*13/.exec(label);
    return m ? Number(m[1]) : null;
  };
  var readCurrentActivity = () => {
    const mobileLabel = document.querySelector(".mobile-summary-trigger")?.getAttribute("aria-label");
    if (mobileLabel) {
      const m = /(?:예상 )?최종 활성\s*([\d,]+)/.exec(mobileLabel);
      if (m) return Number(m[1].replace(/,/g, ""));
    }
    const desktopText = document.querySelector(".metric.final-activity b")?.textContent;
    const n = desktopText ? Number(desktopText.replace(/,/g, "")) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  var readCurrentPhaseRerolls = () => {
    const text = document.querySelector(".reroll-button b")?.textContent?.trim();
    const n = text ? Number(text) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  var choiceIdFromLabelledby = (labelledby) => {
    if (!labelledby || !labelledby.startsWith("choice-title-")) return null;
    return labelledby.slice("choice-title-".length);
  };
  var readPlansChosen = () => {
    if (!isLogPanelOpen()) return [];
    const result = [];
    for (const entry of document.querySelectorAll(".log-entry.log-plan")) {
      const heading = entry.querySelector(".log-entry-heading strong")?.textContent?.trim();
      const name = heading?.replace(/\s*선택$/, "");
      const planId = name ? planIdByName.get(name) : void 0;
      if (planId) result.push(planId);
    }
    return result;
  };
  var emptyState = {
    difficulty: "standard",
    round: 1,
    phase: "potion",
    monsters: [],
    ownedTools: [],
    plansChosen: [],
    claimedThresholds: [],
    pendingToolSelections: 0,
    toolSelection: "general",
    snapshots: [],
    idCounter: 1e3,
    rerolls: { ...DEFAULT_REROLLS }
  };
  var readPage = () => {
    const round = readRound();
    if (round === null) {
      return { state: emptyState, offeredChoices: [], meta: { roundLabel: "", phaseKicker: "", currentActivity: null, unsupported: "\uB77C\uC6B4\uB4DC \uD45C\uC2DC\uB97C \uC778\uC2DD\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4 (\uBAA8\uBC14\uC77C/\uB370\uC2A4\uD06C\uD1B1 \uB808\uC774\uC544\uC6C3 \uB9C8\uD06C\uC5C5\uC774 \uB458 \uB2E4 \uBC14\uB00C\uC5C8\uC744 \uC218 \uC788\uC74C) \u2014 \uD654\uBA74\uC774 \uC548\uC815\uB41C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." } };
    }
    const monsters = readMonsters();
    const ownedTools = readOwnedTools();
    const currentActivity = readCurrentActivity();
    const decision = document.querySelector(".decision");
    const phaseKicker = decision?.querySelector(".phase-kicker")?.textContent?.trim() ?? "";
    const roundLabel = document.querySelector(".mobile-round")?.getAttribute("aria-label") ?? (document.querySelector(".round-value")?.textContent ? `\uB77C\uC6B4\uB4DC ${document.querySelector(".round-value")?.textContent}` : "");
    let phase = "potion";
    let toolSelection = "general";
    if (phaseKicker.includes("\uC218\uC220\uB3C4\uAD6C")) {
      phase = "tool";
      toolSelection = round === 1 && ownedTools.length === 0 ? "pre" : "general";
    } else if (phaseKicker.includes("\uD50C\uB79C")) {
      phase = "plan";
    }
    const cards = decision ? Array.from(decision.querySelectorAll(".choice-card")) : [];
    const offeredChoices = [];
    for (const card of cards) {
      const id = choiceIdFromLabelledby(card.querySelector(".choice-select")?.getAttribute("aria-labelledby") ?? null);
      if (!id) continue;
      if (phase === "tool") offeredChoices.push({ kind: "tool", id });
      else if (phase === "plan") offeredChoices.push({ kind: "plan", id });
      else if (isBoxId(id)) offeredChoices.push({ kind: "box", id });
      else offeredChoices.push({ kind: "potion", id });
    }
    const currentPhaseRerolls = readCurrentPhaseRerolls();
    const rerolls = { ...DEFAULT_REROLLS };
    if (currentPhaseRerolls !== null) {
      if (phase === "tool") rerolls.tool = currentPhaseRerolls;
      else if (phase === "potion" || phase === "box") rerolls.potion = currentPhaseRerolls;
    }
    const state = {
      difficulty: "standard",
      // recommend()가 호출 시점에 탐색 설정의 difficulty로 항상 덮어쓰므로 여기 값은 의미 없음
      round,
      phase,
      monsters,
      ownedTools,
      plansChosen: phase === "plan" ? readPlansChosen() : [],
      claimedThresholds: TOOL_THRESHOLDS.filter((t) => totalActivity(monsters) >= t),
      pendingToolSelections: phase === "tool" ? 1 : 0,
      toolSelection,
      snapshots: [],
      // 라운드 11~13 플랜 스냅샷은 v1에서 정확히 복원하지 않음 (알려진 한계)
      idCounter: 1e3,
      rerolls
    };
    return { state, offeredChoices, meta: { roundLabel, phaseKicker, currentActivity } };
  };

  // src/browser/overlay.ts
  var PANEL_ID = "vorax-recommender-overlay";
  var ACCENT_GOLD = "#FFC876";
  var PANEL_BG = "rgba(22, 22, 34, 0.92)";
  var CHIP_BG = "#2A2A3D";
  var DIVIDER = "rgba(255,255,255,0.08)";
  var RANK_COLORS = ["#FFC876", "#C9C9D9", "#CD9A6B"];
  var ensurePanel = () => {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    Object.assign(panel.style, {
      position: "fixed",
      top: "12px",
      right: "12px",
      width: "320px",
      maxHeight: "80vh",
      overflowY: "auto",
      background: PANEL_BG,
      color: "#f0f0f5",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "12px",
      borderRadius: "16px",
      padding: "12px 14px",
      zIndex: "999999",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      lineHeight: "1.4"
    });
    document.body.appendChild(panel);
    return panel;
  };
  var setPanelHidden = (hidden) => {
    ensurePanel().style.display = hidden ? "none" : "";
  };
  var collapsed = false;
  var renderLast = null;
  var showCollapsedBadge = () => {
    const panel = ensurePanel();
    Object.assign(panel.style, { width: "40px", minWidth: "40px", padding: "0", overflow: "hidden" });
    panel.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;background:${ACCENT_GOLD};color:#000;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;">V</div>`;
    panel.querySelector("div")?.addEventListener("click", () => {
      collapsed = false;
      Object.assign(panel.style, { width: "320px", minWidth: "", padding: "12px 14px", overflow: "visible" });
      renderLast?.();
    });
  };
  var collapseButton = () => `<span id="vr-collapse" title="\uC7A0\uAE50 \uC811\uC5B4\uB450\uAE30" style="cursor:pointer;opacity:0.7;padding:2px 4px;">\u2715</span>`;
  var wireCollapseButton = (panel) => {
    panel.querySelector("#vr-collapse")?.addEventListener("click", () => {
      collapsed = true;
      showCollapsedBadge();
    });
  };
  var withRealSlots = (state, c) => {
    if (c.action.kind !== "potion" || !c.action.targetIds.length) return c.label;
    const slots = c.action.targetIds.map((id) => state.monsters.find((m) => m.id === id)?.slot).filter((s) => s !== void 0).sort((a, b) => a - b).map((s) => s + 1);
    if (!slots.length) return c.label;
    const name = c.label.split(" \u2192 ")[0];
    return `${name} \u2192 ${slots.join(",")}\uBC88 \uADF8\uB8F9`;
  };
  var deltaText = (c) => {
    const m = /([+-][\d,]+)$/.exec(c.note);
    return m ? m[1] : null;
  };
  var renderStatus = (message) => {
    renderLast = () => renderStatus(message);
    if (collapsed) return showCollapsedBadge();
    const panel = ensurePanel();
    panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-weight:700;color:${ACCENT_GOLD};">Vorax \uCD94\uCC9C\uAE30</div>
      ${collapseButton()}
    </div>
    <div style="opacity:0.8;">${message}</div>
  `;
    wireCollapseButton(panel);
  };
  var renderCandidates = (state, candidates, meta, options2, callbacks) => {
    renderLast = () => renderCandidates(state, candidates, meta, options2, callbacks);
    if (collapsed) return showCollapsedBadge();
    const panel = ensurePanel();
    const maxExpected = candidates.reduce((m, c) => Math.max(m, c.expected), 0) || 1;
    const rows = candidates.map((c, i) => {
      const rankColor = RANK_COLORS[i] ?? "#9a9a9a";
      const fraction = Math.max(0.03, Math.min(1, c.expected / maxExpected));
      const delta = deltaText(c);
      const valueText = delta ?? Math.round(c.expected).toLocaleString("ko-KR");
      const valueColor = delta?.startsWith("-") ? "#FF8A80" : delta ? "#7CFC9A" : ACCENT_GOLD;
      return `<div style="padding:8px 0;border-top:1px solid ${DIVIDER};">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:0 0 auto;width:20px;height:20px;border-radius:50%;background:${rankColor};color:#000;font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;">${i + 1}</div>
          <div style="flex:1 1 auto;font-weight:500;">${escapeHtml(withRealSlots(state, c))}</div>
          <div style="flex:0 0 auto;color:${valueColor};font-weight:600;" title="\uC608\uC0C1 \uCD5C\uC885 \uD65C\uC131 \uBCC0\uD654">${valueText}</div>
        </div>
        <div style="margin:4px 0 0 28px;height:5px;border-radius:3px;background:${CHIP_BG};overflow:hidden;">
          <div style="width:${(fraction * 100).toFixed(1)}%;height:100%;background:${rankColor};"></div>
        </div>
        <div style="margin-left:28px;opacity:0.7;font-size:11px;margin-top:3px;">\uB2E4\uC74C \uB77C\uC6B4\uB4DC \uD65C\uC131 \uC608\uC0C1 ${Math.round(c.immediateActivity).toLocaleString("ko-KR")}</div>
      </div>`;
    }).join("");
    const toolNames = state.ownedTools.map((t) => toolById(t.toolId).name);
    const toolChips = toolNames.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">${toolNames.map((n) => `<span style="background:${CHIP_BG};border-radius:20px;padding:3px 10px;">${escapeHtml(n)}</span>`).join("")}</div>` : `<div style="opacity:0.6;margin-top:6px;">(\uC5C6\uC74C)</div>`;
    panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-weight:700;color:${ACCENT_GOLD};">Vorax \uCD94\uCC9C\uAE30</div>
      <div style="display:flex;align-items:center;gap:4px;">
        <button id="vr-refresh" style="background:${ACCENT_GOLD};color:#000;border:none;border-radius:20px;padding:4px 10px;font-weight:600;cursor:pointer;">\u21BB \uC0C8\uB85C\uACE0\uCE68</button>
        ${collapseButton()}
      </div>
    </div>
    <div style="opacity:0.7;margin-bottom:4px;">${escapeHtml(meta.roundLabel)} \xB7 ${escapeHtml(meta.phaseKicker)} \xB7 ${meta.elapsedMs}ms</div>
    <div style="font-weight:500;">\uBCF4\uC720 \uB3C4\uAD6C ${toolNames.length}\uAC1C</div>
    ${toolChips}
    <div style="border-top:1px solid ${DIVIDER};margin-top:8px;"></div>
    ${rows || '<div style="opacity:0.7;padding-top:8px;">\uC120\uD0DD\uC9C0\uB97C \uC778\uC2DD\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.</div>'}
    <details style="margin-top:8px;border-top:1px solid ${DIVIDER};padding-top:8px;">
      <summary style="cursor:pointer;opacity:0.8;color:${ACCENT_GOLD};">\uD0D0\uC0C9 \uC124\uC815</summary>
      <div style="margin-top:6px;display:grid;grid-template-columns:auto 1fr;gap:4px 6px;align-items:center;">
        <label>${helpLabel("\uB09C\uC774\uB3C4", "\uD3EC\uC158/\uB3C4\uAD6C \uB4F1\uAE09\uC774 \uBF51\uD788\uB294 \uD655\uB960 \uBD84\uD3EC\uB97C \uACB0\uC815\uD569\uB2C8\uB2E4. challenge\uC77C\uC218\uB85D \uB354 \uB192\uC740 \uB4F1\uAE09\uC774 \uC798 \uB098\uC635\uB2C8\uB2E4.")}</label>
        <select id="vr-difficulty" style="background:${CHIP_BG};color:#fff;border:none;border-radius:6px;padding:2px 4px;">
          ${["practice", "standard", "challenge"].map((d) => `<option value="${d}" ${options2.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}
        </select>
        <label>${helpLabel("depth", "\uC9C0\uAE08 \uC120\uD0DD \uC774\uD6C4 \uC55E\uC73C\uB85C \uBA87 \uC218\uAE4C\uC9C0 \uB0B4\uB2E4\uBCF4\uACE0 \uACC4\uC0B0\uD560\uC9C0 \uC815\uD569\uB2C8\uB2E4. \uD074\uC218\uB85D \uB354 \uC815\uD655\uD558\uC9C0\uB9CC \uD6E8\uC52C \uB290\uB824\uC9D1\uB2C8\uB2E4.")}</label>
        <input id="vr-depth" type="number" min="1" max="10" value="${options2.depth}" style="width:50px;background:${CHIP_BG};color:#fff;border:none;border-radius:6px;padding:2px 4px;">
        <label>${helpLabel("beamWidth", "\uB9E4 \uC218\uB9C8\uB2E4 \uC720\uB9DD\uD55C \uD6C4\uBCF4\uB97C \uBA87 \uAC1C\uAE4C\uC9C0\uB9CC \uCD94\uB824\uC11C \uB354 \uAE4A\uC774 \uD0D0\uC0C9\uD560\uC9C0 \uC815\uD569\uB2C8\uB2E4. \uD074\uC218\uB85D \uB354 \uC815\uD655\uD558\uC9C0\uB9CC \uD6E8\uC52C \uB290\uB824\uC9D1\uB2C8\uB2E4.")}</label>
        <input id="vr-beam" type="number" min="1" max="5" style="width:50px;background:${CHIP_BG};color:#fff;border:none;border-radius:6px;padding:2px 4px;" value="${options2.beamWidth}">
        <label>${helpLabel("rolloutsRoot", "\uC9C0\uAE08 \uC774 \uC120\uD0DD\uC9C0\uB4E4\uC744 \uBA87 \uBC88 \uBC18\uBCF5 \uC2DC\uBBAC\uB808\uC774\uC158\uD574\uC11C \uD3C9\uADE0 \uB0BC\uC9C0 \uC815\uD569\uB2C8\uB2E4. \uD074\uC218\uB85D \uACB0\uACFC\uAC00 \uC548\uC815\uC801\uC774\uC9C0\uB9CC \uB290\uB824\uC9D1\uB2C8\uB2E4.")}</label>
        <input id="vr-rollouts" type="number" min="1" max="200" value="${options2.rolloutsRoot}" style="width:50px;background:${CHIP_BG};color:#fff;border:none;border-radius:6px;padding:2px 4px;">
      </div>
    </details>
  `;
    const clampedInput = (input, min, max, fallback) => {
      const raw = Number(input.value);
      const clamped = Number.isFinite(raw) ? Math.min(max, Math.max(min, Math.round(raw))) : fallback;
      input.value = String(clamped);
      return clamped;
    };
    wireCollapseButton(panel);
    panel.querySelector("#vr-refresh")?.addEventListener("click", callbacks.onRefresh);
    panel.querySelector("#vr-difficulty")?.addEventListener("change", (e) => callbacks.onOptionsChange({ difficulty: e.target.value }));
    panel.querySelector("#vr-depth")?.addEventListener("change", (e) => callbacks.onOptionsChange({ depth: clampedInput(e.target, 1, 10, options2.depth) }));
    panel.querySelector("#vr-beam")?.addEventListener("change", (e) => callbacks.onOptionsChange({ beamWidth: clampedInput(e.target, 1, 5, options2.beamWidth) }));
    panel.querySelector("#vr-rollouts")?.addEventListener("change", (e) => callbacks.onOptionsChange({ rolloutsRoot: clampedInput(e.target, 1, 200, options2.rolloutsRoot) }));
  };
  var escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var helpLabel = (label, help) => `${escapeHtml(label)} <span title="${escapeHtml(help)}" style="display:inline-block;width:13px;height:13px;line-height:13px;border-radius:50%;background:${CHIP_BG};color:${ACCENT_GOLD};font-size:10px;text-align:center;cursor:help;">?</span>`;

  // src/browser/main.ts
  var STORAGE_KEY = "vorax-recommender:options:v1";
  var loadOptions = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultSearchOptions("standard"), ...JSON.parse(raw) };
    } catch {
    }
    return { ...defaultSearchOptions("standard"), depth: 4, rolloutsRoot: 24, beamWidth: 2 };
  };
  var saveOptions = (opts) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ difficulty: opts.difficulty, depth: opts.depth, rolloutsRoot: opts.rolloutsRoot, beamWidth: opts.beamWidth }));
    } catch {
    }
  };
  var hashSnapshot = (snapshot) => hashString(JSON.stringify({ s: snapshot.state, c: snapshot.offeredChoices }));
  var options = loadOptions();
  var running = false;
  var lastHash = null;
  var runOnce = (forceRecompute = false) => {
    if (running) return;
    if (isLogPanelOpen()) {
      setPanelHidden(true);
      return;
    }
    setPanelHidden(false);
    running = true;
    try {
      const snapshot = readPage();
      if (snapshot.meta.unsupported) {
        renderStatus(snapshot.meta.unsupported);
        lastHash = null;
        return;
      }
      if (!snapshot.offeredChoices.length) {
        renderStatus(`\uC120\uD0DD\uC9C0\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4 (${snapshot.meta.phaseKicker || "\uC54C \uC218 \uC5C6\uB294 \uD654\uBA74"}). \uCE74\uB4DC\uAC00 \uB72C \uD654\uBA74\uC5D0\uC11C \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.`);
        lastHash = null;
        return;
      }
      const hash = hashSnapshot(snapshot);
      if (!forceRecompute && hash === lastHash) return;
      lastHash = hash;
      renderStatus("\uACC4\uC0B0 \uC911\u2026");
      const start = performance.now();
      const results = recommend(snapshot.state, snapshot.offeredChoices, { ...options, rng: mulberry32(hash) });
      const elapsedMs = Math.round(performance.now() - start);
      renderCandidates(snapshot.state, results, { roundLabel: snapshot.meta.roundLabel, phaseKicker: snapshot.meta.phaseKicker, elapsedMs }, options, {
        onRefresh: () => runOnce(true),
        onOptionsChange: (patch) => {
          options = { ...options, ...patch };
          saveOptions(options);
          runOnce(true);
        }
      });
    } catch (err) {
      renderStatus(`\uC624\uB958: ${err instanceof Error ? err.message : String(err)}`);
      console.error("[vorax-recommender]", err);
    } finally {
      running = false;
    }
  };
  var debounceTimer;
  var scheduleRun = () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => runOnce(false), 300);
  };
  var observer = new MutationObserver(scheduleRun);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  runOnce(false);
})();
