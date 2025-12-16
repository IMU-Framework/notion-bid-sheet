import { WORKTYPE_ORDER } from "./worktype-order.js";

fetch("/api/bid")
  .then(res => {
    if (!res.ok) throw new Error("API 錯誤，狀態碼：" + res.status);
    return res.json();
  })
  .then(({ dbTitle, dbDescription, items }) => {
   // ✅ 只保留 Stage 為「發包項」的資料
  const filteredItems = items.filter(item => item.Stage === "發包項");
  document.title = dbTitle;
  document.querySelector("h1").textContent = dbTitle;

  const descEl = document.getElementById("db-description");
  if (descEl) descEl.innerHTML = dbDescription;
    const grouped = groupBy(filteredItems, 'WorkType');
    renderPage(grouped);
  })
  .catch(err => {
    const container = document.getElementById('table-container');
    container.innerHTML = `<p class="text-red-600">❌ 資料載入失敗：${err.message}</p>`;
    console.error("❌ 發生錯誤：", err);
  });

function groupBy(arr, key) {
  return arr.reduce((acc, cur) => {
    const group = cur[key] || "未分類";
    acc[group] = acc[group] || [];
    acc[group].push(cur);
    return acc;
  }, {});
}

function formatMoney(n) {
  return `$${n.toLocaleString("en-US")}`;
}

function renderPage(groups) {
  const container = document.getElementById('table-container');
  container.innerHTML = "";

  const allItems = Object.values(groups).flat();
  const updateDate = allItems[0]?.Updated?.slice(0, 10) || "";

  // =========================
  // TOC（Sticky）
  // =========================
  const tocWrapper = document.createElement("div");
  tocWrapper.className =
    "mb-4 sticky top-0 z-20 bg-white border-b border-gray-200";

  const tocInner = document.createElement("div");
  tocInner.className = "px-2 py-2";

  tocWrapper.appendChild(tocInner);
  container.appendChild(tocWrapper);

  const activeWorkTypes = Object.keys(groups)
    .filter(type => groups[type].length > 0)
    .sort((a, b) => {
      const indexA = WORKTYPE_ORDER.indexOf(a);
      const indexB = WORKTYPE_ORDER.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  const tocButtons = {};

  // ===== 桌機版 TOC（buttons）=====
  const buttonBar = document.createElement("div");
  buttonBar.className = "hidden md:flex flex-wrap gap-2 items-center";

  // ===== 行動版 TOC（select）=====
  const selectBox = document.createElement("select");
  selectBox.className =
    "md:hidden w-full border px-2 py-1 text-sm rounded";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "跳轉至工種…";
  selectBox.appendChild(defaultOption);

  activeWorkTypes.forEach(type => {
    // --- Desktop button ---
    const button = document.createElement("button");
    button.textContent = type;
    button.className =
      "px-3 py-1 text-sm rounded bg-gray-200 transition";
    button.dataset.type = type;

    button.addEventListener("click", () => {
      const target = document.getElementById(`worktype-${type}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    tocButtons[type] = button;
    buttonBar.appendChild(button);

    // --- Mobile select ---
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    selectBox.appendChild(option);
  });

  selectBox.addEventListener("change", e => {
    const type = e.target.value;
    if (!type) return;

    const target = document.getElementById(`worktype-${type}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  tocInner.appendChild(buttonBar);
  tocInner.appendChild(selectBox);

  // =========================
  // 表格區
  // =========================
  const tableContainer = document.createElement("div");
  container.appendChild(tableContainer);

  const updateTag = document.getElementById("update-time");
  if (updateTag) updateTag.textContent = `最後更新日期：${updateDate}`;

  const chineseNumbers = [
    "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"
  ];

  // =========================
  // IntersectionObserver（TOC 高亮）
  // =========================
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const workType = entry.target.id.replace("worktype-", "");

        // desktop buttons
        Object.values(tocButtons).forEach(btn => {
          btn.classList.remove("bg-gray-800", "text-white");
          btn.classList.add("bg-gray-200");
        });

        const activeBtn = tocButtons[workType];
        if (activeBtn) {
          activeBtn.classList.remove("bg-gray-200");
          activeBtn.classList.add("bg-gray-800", "text-white");
        }

        // mobile select
        selectBox.value = workType;
      });
    },
    { threshold: 0.4 }
  );

  // =========================
  // Render tables
  // =========================
  let visibleGroupCount = 0;

  const sortedGroupEntries = Object.entries(groups).sort(([a], [b]) => {
    const indexA = WORKTYPE_ORDER.indexOf(a);
    const indexB = WORKTYPE_ORDER.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  sortedGroupEntries.forEach(([WorkType, items]) => {
    if (!items.length) return;

    const sortedItems = [...items].sort((a, b) => {
      if (a.Order != null && b.Order != null) return a.Order - b.Order;
      if (a.Order != null) return -1;
      if (b.Order != null) return 1;
      return 0;
    });

    const section = document.createElement("details");
    section.setAttribute("open", "true");
    section.className = "avoid-break";
    section.id = `worktype-${WorkType}`;

    const summary = document.createElement("summary");
    summary.className =
      "mt-4 cursor-pointer font-semibold bg-gray-100 px-4 py-1 rounded";
    summary.textContent =
      `${chineseNumbers[visibleGroupCount] || (visibleGroupCount + 1)}、${WorkType}`;
    visibleGroupCount++;

    const wrapper = document.createElement("div");
    wrapper.className = "overflow-x-auto mt-1";

    const table = document.createElement("table");
    table.className = "w-full border border-gray-300 text-sm";

    table.innerHTML = `
      <thead class="bg-gray-100">
        <tr>
          <th class="border px-1 py-1 w-[40px] text-xs">#</th>
          <th class="border px-2 py-1 w-[16%] text-xs">工程項目</th>
          <th class="border px-2 py-1 w-[40%] text-xs">規格描述</th>
          <th class="border px-2 py-1 text-xs">備註／參考張號</th>
          <th class="border px-2 py-1 text-right w-[45px] text-xs">數量</th>
          <th class="border px-2 py-1 w-[45px] text-xs">單位</th>
          <th class="border px-2 py-1 w-[80px] text-xs">連結</th>
        </tr>
      </thead>
      <tbody>
        ${sortedItems.map(item => `
          <tr>
            <td class="border px-2 py-1 text-xs text-center">${item.Order}</td>
            <td class="border px-2 py-1 text-sm">${item.Item}</td>
            <td class="border px-2 py-1 text-xs">${item.Spec}</td>
            <td class="border px-2 py-1 text-xs">${item.Note}</td>
            <td class="border px-2 py-1 text-right text-xs ${item.Qty == null ? 'text-gray-400 italic' : ''}">
              ${item.Qty == null ? '待定' : item.Qty}
            </td>
            <td class="border px-2 py-1 text-xs">${item.Unit}</td>
            <td class="border px-2 py-1 text-[10px]">${item.Reference}</td>
          </tr>
        `).join("")}
      </tbody>
    `;

    wrapper.appendChild(table);
    section.appendChild(summary);
    section.appendChild(wrapper);
    tableContainer.appendChild(section);

    observer.observe(section);
  });
}
