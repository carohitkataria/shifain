import assert from "node:assert/strict";
import { toUzCyrillic } from "../../src/lib/uz-cyrillic.ts";

const cases: [string, string][] = [
  ["elektron tibbiy viza (e-Medical)", "электрон тиббий виза (e-Medical)"],
  ["FRRO da roʻyxatdan oʻtish", "FRRO да рўйхатдан ўтиш"],
  ["hamroh vizasi (Medical Attendant)", "ҳамроҳ визаси (Medical Attendant)"],
  ["Oʻzbekiston", "Ўзбекистон"],
  ["O'zbekcha", "Ўзбекча"],
  ["shifoxona", "шифохона"],
  ["Choy", "Чой"],
  ["yoʻl", "йўл"],
  ["yangi", "янги"],
  ["yoz", "ёз"],
  ["yuz", "юз"],
  ["ertaga", "эртага"],
  ["maʼlumot", "маълумот"],
  ["Gʻalaba", "Ғалаба"],
  ["qoʻngʻiroq", "қўнғироқ"],
  ["Hujjatlar", "Ҳужжатлар"],
  ["Shifain bilan", "Shifain билан"],
  ["WhatsApp yoki Telegram", "WhatsApp ёки Telegram"],
  ["care@shifain.com", "care@shifain.com"],
  ["https://shifain.com/uz", "https://shifain.com/uz"],
  ["24 soat", "24 соат"],
  ["SHIFOXONA", "ШИФОХОНА"],
];
for (const [latin, cyrillic] of cases) assert.equal(toUzCyrillic(latin), cyrillic, latin);
console.log(`uz-cyrillic: ${cases.length} words convert`);
