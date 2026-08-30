// G:\works\수술픽업추천\dist\vorax-recommender.user.js (Vorax Room 카드 추천기 유저스크립트)가
// 갱신되면 이 스크립트로 src/vorax-recommender.js에 반영한다. 유저스크립트 전용 헤더
// (==UserScript==...==/UserScript==)는 콘텐츠 스크립트에서 의미가 없으므로 제거하고,
// 대신 manifest.json의 content_scripts 항목이 매치 대상을 담당한다는 안내 주석으로 바꾼다.
//
//   node scripts/sync-vorax-recommender.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = "G:/works/수술픽업추천/dist/vorax-recommender.user.js";
const DEST = path.join(ROOT, "src", "vorax-recommender.js");

const REPLACEMENT_HEADER =
  "// Vorax Room 수술실 미니게임에서 예상 최종 활성이 가장 높은 선택지를 추천하는 콘텐츠 스크립트\n" +
  "// (제한 깊이 탐색, 실제 게임과 무관한 로컬 계산). madstone290.github.io/VoraxRoom/ 전용.\n";

const raw = readFileSync(SOURCE, "utf8");
const withoutHeader = raw.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n/, "");

if (withoutHeader === raw) {
  throw new Error(`Couldn't find a ==UserScript== header block in ${SOURCE} - did its format change?`);
}

writeFileSync(DEST, REPLACEMENT_HEADER + withoutHeader);
console.log(`Synced ${SOURCE} -> ${DEST}`);
