// 사내 지식(공정 매뉴얼/Knowledge book) 검색 — BM25, 외부 라이브러리/서버 없이 클라이언트에서 계산.
// knowledge/build_index.py 로 생성한 knowledge/index.json 을 그대로 로드해 사용한다.
// 토큰화 로직은 build_index.py 의 tokenize()와 반드시 동일하게 유지할 것.

const K1 = 1.5;
const B = 0.75;

const knowledgeState = {
  index: null,
  query: ""
};

async function initKnowledge() {
  knowledgeState.index = await fetch("knowledge/index.json").then((r) => r.json());

  const box = document.getElementById("knowledge-search-box");
  box.addEventListener("input", (e) => {
    knowledgeState.query = e.target.value.trim();
    renderKnowledge();
  });

  renderKnowledge();
}

function tokenize(text) {
  const lower = text.toLowerCase();
  const tokens = lower.match(/[가-힣]+|[a-z0-9]+/g) || [];
  const out = [];
  for (const t of tokens) {
    out.push(t);
    if (/^[가-힣]+$/.test(t) && t.length >= 2) {
      for (let i = 0; i < t.length - 1; i++) {
        out.push(t.slice(i, i + 2));
      }
    }
  }
  return out;
}

function bm25Search(query) {
  const idx = knowledgeState.index;
  if (!idx) return [];

  const queryTerms = tokenize(query);
  const scores = {};

  queryTerms.forEach((term) => {
    const termInfo = idx.terms[term];
    if (!termInfo) return;

    const idf = Math.log((idx.totalDocs - termInfo.df + 0.5) / (termInfo.df + 0.5) + 1);

    Object.entries(termInfo.postings).forEach(([docId, tf]) => {
      const docLen = idx.docLengths[docId] || idx.avgDocLength;
      const denom = tf + K1 * (1 - B + (B * docLen) / idx.avgDocLength);
      const score = idf * ((tf * (K1 + 1)) / denom);
      scores[docId] = (scores[docId] || 0) + score;
    });
  });

  return Object.entries(scores)
    .map(([docId, score]) => ({ doc: idx.docs.find((d) => d.id === docId), score }))
    .filter((r) => r.doc)
    .sort((a, b) => b.score - a.score);
}

function knowledgeMatchesPlantFilter(doc) {
  if (state.selectedPlants.size === 0) return true;
  return doc.plants.some((p) => state.selectedPlants.has(p)) || doc.plants.includes("utility");
}

function renderKnowledge() {
  const list = document.getElementById("knowledge-list");
  const countEl = document.getElementById("knowledge-result-count");
  if (!list || !countEl || !knowledgeState.index) return;

  list.innerHTML = "";

  let results;
  if (knowledgeState.query) {
    results = bm25Search(knowledgeState.query).filter((r) => knowledgeMatchesPlantFilter(r.doc));
  } else {
    results = knowledgeState.index.docs
      .filter((d) => knowledgeMatchesPlantFilter(d))
      .map((doc) => ({ doc, score: 0 }));
  }

  countEl.textContent = knowledgeState.query
    ? `"${knowledgeState.query}" 검색 결과 ${results.length}건`
    : `${results.length}건 (공장 필터 기준, 관련도순 정렬은 검색어 입력 시)`;

  if (results.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "일치하는 사내 자료가 없습니다.";
    list.appendChild(empty);
    return;
  }

  results.forEach(({ doc }) => list.appendChild(renderKnowledgeCard(doc)));
}

function renderKnowledgeCard(doc) {
  const card = document.createElement("div");
  card.className = "case-card";

  const title = document.createElement("h3");
  title.textContent = doc.title;
  card.appendChild(title);

  const summary = document.createElement("p");
  summary.className = "summary";
  summary.textContent = doc.excerpt;
  card.appendChild(summary);

  const tagRow = document.createElement("div");
  tagRow.className = "tag-row";
  doc.plants.forEach((pid) => {
    const plant = state.taxonomy.plants.find((p) => p.id === pid);
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = plant ? plant.name : pid;
    tagRow.appendChild(tag);
  });
  card.appendChild(tagRow);

  return card;
}
