# STT 후처리 실험 데이터 계획

> **보관 문서 — 현재 연구 설계에는 적용하지 않음.** 아래 내용은 일반 STT 음성 코퍼스를 늘리는 초기 제안이다. 원 계획서의 출발점인 **상용 서비스에서 실제 관찰된 오인식 사례**를 반영한 현행 설계는 [실험 재설계](EXPERIMENT1_RESTART_PLAN.md)를 따른다. 아래 표본 수·수집 우선순위·평가 구조는 현행 권고가 아니다.

> 가정: 한국어 STT 출력의 오탈자, 띄어쓰기, 문장부호, 숫자·고유명사를 교정하는 실험. 대상 도메인과 현재 보유량이 확인되면 수집 비율과 정답 표기 규칙을 조정한다.

## 1. 먼저 고정할 실험 단위

- **입력:** 실제로 사용할 STT 모델의 원본 출력(`hypothesis_raw`). 모델명, 버전, 디코딩 옵션을 기록한다.
- **정답:** 음성을 듣고 사람이 검수한 전사(`reference_verbatim`)와, 최종 출력 정책에 맞게 편집한 문장(`target_edited`)을 분리한다. 공개 데이터의 전사는 초안이며 자동으로 최종 정답으로 간주하지 않는다.
- **단위:** 한 화자의 한 발화 또는 짧은 문장 묶음. 가능하면 5~30초를 우선 수집하고, 문맥이 필요한 경우 이전·다음 발화를 별도 필드로 연결한다. 길이 기준은 파일 품질을 본 뒤 조정한다.
- **목표:** `hypothesis_raw → target_edited`의 개선 효과를 측정하되, 음성에서 복구할 수 없는 내용을 추측해서 덧붙이지 않는지 별도로 본다.

## 2. 저장 구조

```text
data/
  raw/                      # 제공 원본 그대로 보존; 저장소에는 올리지 않음
    {source}/{release}/
  manifests/
    sources.csv              # 출처, 버전, URL, 이용 조건, 다운로드 날짜, 해시
    clips.jsonl              # 음성/화자/세션 단위의 공통 메타데이터
  asr/
    {engine}_{version}.jsonl # STT 원문과 실행 설정
  labels/
    guideline.md             # 정답 표기 규칙
    annotations.jsonl        # 검수 전사, 편집 정답, 오류 태그, 검수 상태
  splits/
    v1_train.txt
    v1_dev.txt
    v1_test.txt
    v1_challenge.txt
  reports/
    v1_inventory.csv         # 출처/도메인/길이/오류 유형별 건수와 시간
```

`clip_id`를 모든 파일의 연결 키로 쓴다. 원본 파일명과 출처별 ID도 유지한다. 공개 자료가 섞이면 원본을 하나의 재배포용 파일로 합치지 않고 각 제공처의 이용 조건을 기록한다.

### `clips.jsonl` 예시

```json
{"clip_id":"aih-132-000001","source_id":"aihub_meeting_132","source_item_id":"000001","audio_path":"raw/aihub_meeting_132/v1/000001.wav","audio_sha256":"...","duration_ms":12400,"language":"ko","domain":"meeting","speaker_id":"spk_001","session_id":"meeting_001","start_ms":0,"end_ms":12400,"recording_condition":"multi_speaker","source_split":"train"}
```

### `asr/*.jsonl` 예시

```json
{"clip_id":"aih-132-000001","engine":"example-asr","engine_version":"2026-10","decode_config_id":"default-v1","hypothesis_raw":"다음 주 회이 일정은 수요일 입니다","created_at":"2026-10-16T00:00:00Z"}
```

### `annotations.jsonl` 예시

```json
{"clip_id":"aih-132-000001","reference_verbatim":"다음 주 회의 일정은 수요일입니다.","target_edited":"다음 주 회의 일정은 수요일입니다.","error_tags":["substitution","spacing","punctuation"],"label_status":"double_checked","reviewer_ids":["r1","r2"],"guideline_version":"v1","ambiguous":false}
```

원본 전사, STT 출력, 사람 정답을 **서로 다른 필드**로 유지한다. 여러 STT 엔진을 비교할 때는 같은 `clip_id`에 별도의 `asr` 레코드를 추가한다.

## 3. 수집처 우선순위

| 우선 | 수집처 | 적합한 용도 | 시작 방법과 주의점 |
| --- | --- | --- | --- |
| 1 | 현재 보유한 실제 사용 환경 음성 | 가장 중요한 최종 평가 자료 | 동의·권리 상태를 확인하고, 원본 음성과 STT 출력을 짝지어 인벤토리화. 화자와 세션을 분리 키로 기록. |
| 2 | [AI Hub 한국어 음성](https://aihub.or.kr/aihubdata/data/view.do?aihubDataSe=data&currMenu=11&dataSetSn=123&topMenu=) | 자유 대화의 간투사·머뭇거림 | 사이트 설명상 약 1,000시간. 제공 전사 형식이 별도이므로 인코딩과 전사 규칙을 변환하고, 정답을 재검수. 신청·이용 조건 확인. |
| 3 | [AI Hub 회의 음성](https://aihub.or.kr/aihubdata/data/view.do?aihubDataSe=data&currMenu=11&dataSetSn=132&topMenu=) / [주요 영역별 회의 음성인식](https://www.aihub.or.kr/aihubdata/data/view.do?aihubDataSe=realm&dataSetSn=464) | 회의·다화자·겹침·잡음 | 실제 목표가 회의록이면 우선순위를 2보다 높인다. 화자 중첩 구간을 별도 태그로 분리. 신청·이용 조건 확인. |
| 4 | [Zeroth-Korean (OpenSLR SLR40)](https://www.openslr.org/40/) | 재현 가능한 공개 기준선 | 약 51.6시간 학습, 1.2시간 시험, CC BY 4.0. 비교적 깨끗한 읽기 음성이라 실제 대화 오류 분포와 차이가 날 수 있다. |
| 5 | [FLEURS `ko_kr`](https://huggingface.co/datasets/google/fleurs/tree/main/data/ko_kr) | 소규모 외부 평가, 빠른 파이프라인 점검 | CC BY 4.0. 제공 train/dev/test와 화자 분할을 보존한다. 읽기 음성에 치우친다. |
| 6 | [Mozilla Common Voice 한국어](https://commonvoice.mozilla.org/en/datasets) | 화자 다양성·외부 평가 | Mozilla Data Collective에서 한국어 버전 확인 후 내려받는다. 녹음은 주로 읽기 음성. [이용 약관](https://commonvoice.mozilla.org/dav/terms)의 재게시 제한을 확인한다. |

공개 음성만 양적으로 늘리면 실제 서비스의 STT 오류 분포를 놓칠 수 있다. 따라서 공개 자료는 학습·보조 평가에, 실제 사용 환경 자료는 보류 시험 세트에 우선 배정한다. 음성이 없는 한국어 텍스트는 표기 규칙과 도메인 어휘 구축에 활용할 수 있지만, 실제 STT 오류 쌍을 대신하지 않는다.

## 4. 수집·가공 절차

1. **인벤토리:** 현재 파일마다 출처, 음성 유무, STT 원문 유무, 정답 유무, 길이, 도메인, 화자·세션, 권리 상태를 적는다. 중복은 음성 해시와 정규화 전사로 확인한다.
2. **표기 정책:** 숫자(`삼십 분`/`30분`), 영문·약어, 고유명사, 간투사, 반복, 문장부호, 띄어쓰기, 비식별화 규칙을 1페이지 지침으로 고정한다. 원어 보존 전사와 읽기 좋은 최종 문장을 분리한다.
3. **변환:** 출처별 원본을 보존하고 공통 manifest로 매핑한다. 음성 포맷·샘플레이트는 파생 파일에서 통일하며 변환 이력을 남긴다.
4. **STT 실행:** 목표 모델을 고정해 모든 후보 음성에 적용한다. `engine_version`과 설정을 함께 저장한다. 공개 전사에 임의 오류를 주입한 쌍은 별도 `synthetic` 출처로만 관리한다.
5. **검수:** 전사와 음성을 함께 보고 정답을 교정한다. 애매한 사례는 `ambiguous=true`로 보류하고, 시험 세트와 고난도 세트는 두 명이 검수한다.
6. **분할:** 같은 화자·회의·원본 녹음·중복 문장이 train/dev/test를 가로지르지 않게 묶음 단위로 나눈다. 원 제공처의 test 항목은 학습으로 이동하지 않는다.
7. **리포트:** 전체 건수뿐 아니라 총 시간, 출처/도메인/길이/오류 유형별 분포, 정답 검수 비율, 중복·누락률을 매 버전 기록한다.

## 5. 첫 번째 세트 규모와 평가

초기 **작업 목표**로 500~1,000개 발화의 검수된 실제 STT 쌍을 만든다. 이 중 100~200개는 최종 시험용으로 잠그고, 희귀 오류(고유명사, 숫자, 겹침, 장문, 잡음)는 `challenge`에 별도 50~100개를 모은다. 이는 필요한 최소량이라는 뜻이 아니라 파이프라인과 오류 분포를 확인하기 위한 첫 이정표다. 도메인과 현재 보유량을 확인한 뒤 목표를 조정한다.

주 지표는 동일한 정규화 규칙에서 **CER/WER 전후 비교**, `target_edited`와의 문장 단위 정확도, 오류 유형별 개선률이다. 후처리가 이미 맞는 출력을 망치는 비율과 근거 없는 단어 추가도 따로 센다. 개발·시험 세트의 표기 정책이 흔들리면 지표가 무의미해지므로 `guideline_version`을 함께 고정한다.

## 6. 이번 주 실행 순서

1. 기존 데이터 위치와 파일 형식을 확인하고 `sources.csv`, `clips.jsonl` 인벤토리를 먼저 작성한다.
2. 사용 환경에서 50개를 뽑아 오류 유형과 표기 지침을 확정한다.
3. 목표 도메인과 가장 가까운 AI Hub 한 종류의 **샘플** 및 Zeroth/FLEURS 일부로 변환 파이프라인을 검증한다.
4. 한 STT 엔진으로 재인식하고 100개를 이중 검수하여 스키마·지침을 수정한다.
5. 그다음 대량 다운로드·수집을 진행하고, 보류 시험 세트를 잠근다.
