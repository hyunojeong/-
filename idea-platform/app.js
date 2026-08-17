const state = {
  taxonomy: null,
  cases: [],
  selectedPlants: new Set(),
  selectedCategories: new Set(),
  query: ""
};

async function init() {
  const [taxonomy, cases] = await Promise.all([
    fetch("data/taxonomy.json").then((r) => r.json()),
    fetch("data/cases.json").then((r) => r.json())
  ]);
  state.taxonomy = taxonomy;
  state.cases = cases;

  renderPlantFilters();
  renderCategoryFilters();
  render();

  document.getElementById("search-box").addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    render();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    state.selectedPlants.clear();
    state.selectedCategories.clear();
    state.query = "";
    document.getElementById("search-box").value = "";
    document.querySelectorAll(".check-row input").forEach((el) => (el.checked = false));
    document.querySelectorAll(".chip").forEach((el) => el.classList.remove("active"));
    render();
    if (typeof renderKnowledge === "function") renderKnowledge();
  });
}

function renderAll() {
  render();
  if (typeof renderKnowledge === "function") renderKnowledge();
}

function renderPlantFilters() {
  const container = document.getElementById("plant-filters");
  container.innerHTML = "";
  state.taxonomy.businessUnits.forEach((unit) => {
    const group = document.createElement("div");
    group.className = "unit-group";

    const groupName = document.createElement("div");
    groupName.className = "unit-group-name";
    groupName.textContent = unit.name;
    group.appendChild(groupName);

    unit.plants.forEach((plantId) => {
      const plant = state.taxonomy.plants.find((p) => p.id === plantId);
      if (!plant) return;

      const label = document.createElement("label");
      label.className = "check-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = plant.id;
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedPlants.add(plant.id);
        else state.selectedPlants.delete(plant.id);
        renderAll();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(plant.name));
      group.appendChild(label);
    });

    container.appendChild(group);
  });
}

function renderCategoryFilters() {
  const container = document.getElementById("category-filters");
  container.innerHTML = "";
  const row = document.createElement("div");
  row.className = "chip-row";

  state.taxonomy.categories.forEach((cat) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = cat.name;
    chip.addEventListener("click", () => {
      if (state.selectedCategories.has(cat.id)) {
        state.selectedCategories.delete(cat.id);
        chip.classList.remove("active");
      } else {
        state.selectedCategories.add(cat.id);
        chip.classList.add("active");
      }
      render();
    });
    row.appendChild(chip);
  });

  container.appendChild(row);
}

function scoreCase(c) {
  const plantOverlap = c.plants.filter((p) => state.selectedPlants.has(p)).length;
  const categoryOverlap = c.categories.filter((cat) => state.selectedCategories.has(cat)).length;
  const isCrossCutting = c.plants.includes("utility");

  if (state.selectedPlants.size > 0 && plantOverlap === 0 && !isCrossCutting) {
    return null;
  }

  let score = plantOverlap * 2 + categoryOverlap;
  if (state.selectedPlants.size > 0 && plantOverlap === 0 && isCrossCutting) {
    score += 0.5;
  }
  return score;
}

function matchesQuery(c) {
  if (!state.query) return true;
  const haystack = `${c.title} ${c.summary} ${c.ideaPrompt}`.toLowerCase();
  return haystack.includes(state.query);
}

function render() {
  const list = document.getElementById("case-list");
  const countEl = document.getElementById("result-count");
  list.innerHTML = "";

  const scored = state.cases
    .map((c) => ({ c, score: scoreCase(c) }))
    .filter(({ score, c }) => score !== null && matchesQuery(c))
    .sort((a, b) => b.score - a.score);

  countEl.textContent = `${scored.length}개 사례 매칭됨`;

  if (scored.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "조건에 맞는 사례가 없습니다. 필터를 조정해보세요.";
    list.appendChild(empty);
    return;
  }

  scored.forEach(({ c }) => list.appendChild(renderCard(c)));
}

function renderCard(c) {
  const card = document.createElement("div");
  card.className = "case-card";

  const title = document.createElement("h3");
  title.textContent = c.title;
  card.appendChild(title);

  const badge = document.createElement("div");
  badge.className = "benefit-badge";
  badge.textContent = c.quantifiedBenefit;
  card.appendChild(badge);

  const summary = document.createElement("p");
  summary.className = "summary";
  summary.textContent = c.summary;
  card.appendChild(summary);

  const prompt = document.createElement("div");
  prompt.className = "idea-prompt";
  prompt.textContent = `💡 적용 아이디어: ${c.ideaPrompt}`;
  card.appendChild(prompt);

  const tagRow = document.createElement("div");
  tagRow.className = "tag-row";
  c.plants.forEach((pid) => {
    const plant = state.taxonomy.plants.find((p) => p.id === pid);
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = plant ? plant.name : pid;
    tagRow.appendChild(tag);
  });
  c.categories.forEach((cid) => {
    const cat = state.taxonomy.categories.find((x) => x.id === cid);
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = cat ? cat.name : cid;
    tagRow.appendChild(tag);
  });
  card.appendChild(tagRow);

  const link = document.createElement("a");
  link.className = "source-link";
  link.href = c.source.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = `출처: ${c.source.title} ↗`;
  card.appendChild(link);

  return card;
}

init();
