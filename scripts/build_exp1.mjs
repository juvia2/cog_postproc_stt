import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: node build_exp1.mjs raw_tables.json output.xlsx");
}
const raw = JSON.parse(await fs.readFile(inputPath, "utf8"));
const workbook = Workbook.create();

function addFlatSheet(name, headers, rows, widths) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  sheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length).values = [headers, ...rows];
  const header = sheet.getRangeByIndexes(0, 0, 1, headers.length);
  header.format = {
    fill: "#21344D",
    font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
    verticalAlignment: "center",
  };
  header.format.rowHeight = 28;
  const body = sheet.getRangeByIndexes(1, 0, rows.length, headers.length);
  body.format.font = { name: "Arial", size: 10, color: "#17212F" };
  body.format.rowHeight = 22;
  body.format.verticalAlignment = "center";
  sheet.freezePanes.freezeRows(1);
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, rows.length + 1, 1).format.columnWidth = width;
  });
  return sheet;
}

addFlatSheet(
  "사례 원문",
  ["case_id", "actual_utterance_raw", "actual_note_raw", "source_row_first", "source_row_last", "audio_status"],
  raw.cases,
  [14, 42, 48, 18, 18, 35],
);
addFlatSheet(
  "기존 인식 기록",
  ["case_id", "source_model_label", "recognized_text_raw", "recognition_note_raw", "source_row", "status"],
  raw.model_outputs,
  [14, 22, 48, 42, 14, 52],
);

const guide = workbook.worksheets.add("읽기 안내");
guide.showGridLines = false;
guide.getRange("A1:B7").values = [
  ["항목", "설명"],
  ["원본 파일", raw.source_path],
  ["원본 SHA-256", raw.source_sha256],
  ["사례 수", raw.cases.length],
  ["과거 인식 기록 수", raw.model_outputs.length],
  ["과거 인식 문장 공란 수", raw.model_outputs.filter((r) => r[2] === null).length],
  ["범위", "발화 원문과 과거 인식 텍스트·메모만 이전. 피실험자 응답·채점·점수·빈도표·기존 결과는 제외."],
];
guide.getRange("A9:B12").values = [
  ["주의", "내용"],
  ["음성", "이 파일에서 원문 발화에 대응하는 실제 음성 파일을 확인하지 못함. 원문 발화를 새로 녹음해야 함."],
  ["과거 인식 기록", "모델명은 원본 시트의 행 위치 수식으로 지정됨. 기존 인식 문장은 새 녹음의 STT 결과로 재사용하지 않음."],
  ["원문 보존", "텍스트의 띄어쓰기·구두점·끝 공백을 수정하지 않았음. 정답 문장이나 교정문을 새로 만들지 않았음."],
];
guide.getRange("A1:B1").format = { fill: "#21344D", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" } };
guide.getRange("A9:B9").format = { fill: "#21344D", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" } };
guide.getRange("A1:A12").format.columnWidth = 22;
guide.getRange("B1:B12").format.columnWidth = 110;
guide.getRange("A1:B12").format.rowHeight = 24;
guide.getRange("A1:B12").format.font = { name: "Arial", size: 10 };
guide.getRange("A1:B1").format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
guide.getRange("A9:B9").format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
guide.getRange("B2").format.rowHeight = 34;
guide.getRange("B3").format.rowHeight = 34;
guide.getRange("B7").format.rowHeight = 34;
guide.getRange("B10:B12").format.rowHeight = 34;

workbook.recalculate();
for (const sheetName of ["사례 원문", "기존 인식 기록", "읽기 안내"]) {
  const check = await workbook.inspect({
    kind: "table",
    range: sheetName === "읽기 안내" ? "'읽기 안내'!A1:B12" : `'${sheetName}'!A1:F4`,
    include: "values,formulas",
    tableMaxRows: 15,
    tableMaxCols: 8,
    maxChars: 1800,
  });
  console.log(sheetName, check.ndjson.slice(0, 1800));
  const preview = await workbook.render({
    sheetName,
    range: sheetName === "읽기 안내" ? "A1:B12" : "A1:F8",
    scale: 1,
    format: "png",
  });
  const previewPath = outputPath.replace(/\.xlsx$/, `_${sheetName.replaceAll(" ", "_")}.png`);
  await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
}
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 30 },
  maxChars: 1000,
});
console.log("ERRORS", errors.ndjson.slice(0, 1000));
await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log("EXPORTED", outputPath);
