# 증거 보존 계약

> 이 문서는 `public/evidence/` 아래 공개 증거 스냅샷의 보존 정책 정본이다. 헌법은 `AGENTS.md`, 절차는 `docs/agents/`에 있다.
> URL·빌드 계약은 [url-architecture.md](url-architecture.md)와 [build-pipeline.md](build-pipeline.md)를 따른다.

## 스냅샷 불변 규칙

- `public/evidence/<snapshot-id>/`는 해당 시점에 동결된 역사 기록이다. 현재 저장소의 공개 범위·가시성·내용에 맞추기 위해 기존 스냅샷을 다시 쓰지 않는다.
- 새로운 공개 재현이 필요하면 새 스냅샷 ID와 새 디렉터리를 만든다. 기존 스냅샷 ID를 덮어쓰지 않는다.
- `SHA256SUMS`는 그 공개 스냅샷의 바이트를 인증한다. 비공개 원본(origin)과의 동일성(identity)을 증명하지 않는다.
- 각 스냅샷의 `README.md`는 스냅샷 시점의 가시성 상태를 명시한다. 이후 저장소 가시성이 바뀌어도 그 서술은 스냅샷 시점 기준으로 유지한다.

## 한계

- 이 문서는 **정책**이지 기술적 불변성(immutability) 보장이 아니다. 파일과 `SHA256SUMS`를 함께 수정하면 해시 검증은 다시 통과할 수 있다.
