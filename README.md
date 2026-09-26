# cog-postproc-stt

한국어 구어체 STT 모델 인식 오류의 원인이 고빈도어 선택인지 정량적으로 확인하고, 음소 유사 후보군과 문맥 기반 재순위화로 산출물 보정 효과 및 정확도 향상 여부를 검증하는 연구 프로젝트입니다.

## 실행 순서

1. `data/`의 CSV 파일에 실험 문항과 정답 정보를 입력합니다.
2. `.env.example`을 복사해 `.env`를 만들고 API 키를 입력합니다.
3. `npm install`을 실행합니다.
4. 아래 명령을 순서대로 실행합니다.

```powershell
npm run stt
npm run candidates
npm run rerank
npm run evaluate
npm run report
```

모든 경로는 프로젝트 폴더 기준 상대경로로 작성합니다. 따라서 이 폴더 전체를 옮겨도 새 기기에서 Node.js 설치, `npm install`, `.env` 재설정만 하면 됩니다.
