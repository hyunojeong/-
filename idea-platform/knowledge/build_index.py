#!/usr/bin/env python3
"""
사내 지식(공정 매뉴얼/Knowledge book) 문서를 BM25 검색 인덱스로 빌드한다.

- 외부 패키지 의존성 없음 (Python 표준 라이브러리만 사용) — 폐쇄망 VDI 안에서
  pip install 없이 바로 실행 가능하도록 하기 위함.
- docs/ 폴더의 .md 파일을 읽어 index.json을 생성한다.
- 문서 형식은 파일 상단에 간단한 frontmatter(id, title, plants)를 두고
  "---" 구분선 아래에 본문을 적는다. sample 문서들을 참고할 것.

실행: python3 build_index.py
"""
import json
import re
from pathlib import Path

DOCS_DIR = Path(__file__).parent / "docs"
OUTPUT_PATH = Path(__file__).parent / "index.json"

HANGUL_RE = re.compile(r"^[가-힣]+$")
TOKEN_RE = re.compile(r"[가-힣]+|[a-z0-9]+")


def tokenize(text: str):
    """공백 기준 토큰 + 한글 토큰의 문자 bigram을 함께 반환.

    형태소 분석기(mecab-ko 등) 없이도 동작하는 가벼운 방식. 정확한 형태소
    분석은 아니지만, 사내 자료를 색인할 오프라인 환경에 별도 라이브러리
    설치가 필요 없다는 장점이 있다. 나중에 사내에 형태소 분석기를 반입할
    수 있게 되면 이 함수만 교체하면 된다.
    """
    text = text.lower()
    tokens = TOKEN_RE.findall(text)
    out = []
    for t in tokens:
        out.append(t)
        if HANGUL_RE.match(t) and len(t) >= 2:
            for i in range(len(t) - 1):
                out.append(t[i : i + 2])
    return out


def parse_doc(path: Path):
    raw = path.read_text(encoding="utf-8")
    if "---" not in raw:
        raise ValueError(f"{path}: frontmatter 구분선(---)이 없습니다.")
    front, body = raw.split("---", 1)
    meta = {}
    for line in front.strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    if "id" not in meta or "title" not in meta:
        raise ValueError(f"{path}: id/title frontmatter가 필요합니다.")
    plants = [p.strip() for p in meta.get("plants", "").split(",") if p.strip()]
    body = body.strip()
    return {
        "id": meta["id"],
        "title": meta["title"],
        "plants": plants,
        "body": body,
    }


def build_index():
    doc_files = sorted(DOCS_DIR.glob("*.md"))
    if not doc_files:
        raise SystemExit(f"{DOCS_DIR} 에 .md 문서가 없습니다.")

    parsed_docs = [parse_doc(p) for p in doc_files]

    postings = {}  # term -> {doc_id: tf}
    doc_meta = []
    doc_lengths = {}

    for doc in parsed_docs:
        tokens = tokenize(doc["body"])
        doc_lengths[doc["id"]] = len(tokens)

        tf = {}
        for tok in tokens:
            tf[tok] = tf.get(tok, 0) + 1

        for term, count in tf.items():
            postings.setdefault(term, {})[doc["id"]] = count

        excerpt = doc["body"].replace("\n", " ").strip()
        if len(excerpt) > 220:
            excerpt = excerpt[:220] + "…"

        doc_meta.append(
            {
                "id": doc["id"],
                "title": doc["title"],
                "plants": doc["plants"],
                "excerpt": excerpt,
            }
        )

    total_docs = len(parsed_docs)
    avg_doc_length = sum(doc_lengths.values()) / total_docs if total_docs else 0

    terms_out = {
        term: {"df": len(postings_for_term), "postings": postings_for_term}
        for term, postings_for_term in postings.items()
    }

    index = {
        "docs": doc_meta,
        "docLengths": doc_lengths,
        "avgDocLength": avg_doc_length,
        "totalDocs": total_docs,
        "terms": terms_out,
    }

    OUTPUT_PATH.write_text(
        json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"인덱싱 완료: 문서 {total_docs}건, 고유 term {len(terms_out)}개 → {OUTPUT_PATH}")


if __name__ == "__main__":
    build_index()
