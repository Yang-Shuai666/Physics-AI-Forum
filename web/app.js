// 归档页/mini 站点用的客户端筛选，不依赖任何库。
const input = document.querySelector("#filter-input");
const countEl = document.querySelector("#filter-count");

if (input) {
  const items = [...document.querySelectorAll(".archive-list li")];
  const apply = () => {
    const keyword = input.value.trim().toLowerCase();
    let shown = 0;
    for (const item of items) {
      const hit = !keyword || (item.dataset.search ?? "").includes(keyword);
      item.hidden = !hit;
      if (hit) shown += 1;
    }
    if (countEl) countEl.textContent = keyword ? `${shown} / ${items.length}` : "";
    for (const block of document.querySelectorAll(".archive-week, .year-block")) {
      const hasVisible = [...block.querySelectorAll(".archive-list li")].some((li) => !li.hidden);
      block.hidden = block.classList.contains("archive-week") ? !hasVisible : false;
    }
  };
  input.addEventListener("input", apply);
  apply();
}
