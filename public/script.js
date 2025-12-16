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

  container.classList.add("flex", "flex-col");

  const allItems = Object.values(groups).flat();
  const updateDate = allItems[0]?.Updated?.slice(0, 10) || "";

  const activeWorkTypes = Object.keys(groups)
  .filter(type => groups[type].length > 0)
  .sort((a, b) => {
    const indexA = WORKTYPE_ORDER.indexOf(a);
    const indexB = WORKTYPE_ORDER.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
  
  const totalCount = activeWorkTypes.length;
  
// === Filter：多選下拉（checkbox dropdown） ===
const filterBox = document.createElement("div");
filterBox.className = "mb-4 relative inline-block ml-auto print:hidden";

// 預設：全部工種都選取
let selectedTypes = new Set(activeWorkTypes);

// 主按鈕
const filterButton = document.createElement("button");
filterButton.className =
  "border px-3 py-1 text-sm rounded bg-white shadow-sm hover:bg-gray-50";
filterButton.textContent = "篩選工種 ▼";

filterBox.appendChild(filterButton);

// 下拉容器
const dropdown = document.createElement("div");
dropdown.className =
  "absolute z-10 mt-1 w-56 bg-white border rounded shadow hidden";

filterBox.appendChild(dropdown);

// === 操作列：全部選取 / 全部清除 ===
const actionBar = document.createElement("div");
actionBar.className =
  "flex justify-between px-3 py-1 text-xs border-b bg-gray-50";

// 全部選取
const selectAllBtn = document.createElement("button");
selectAllBtn.type = "button";
selectAllBtn.className = "text-blue-600 hover:underline";
// 初始文字
  function updateSelectAllLabel() {
  selectAllBtn.textContent =
    `全部選取 (${selectedTypes.size} / ${totalCount})`;
  }
updateSelectAllLabel(); // 初始化
  
selectAllBtn.addEventListener("click", e => {
  e.stopPropagation();

  selectedTypes = new Set(activeWorkTypes);

  // 勾選所有 checkbox
  dropdown.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.checked = true;
  });
  updateSelectAllLabel();
  renderTables();
});

// 全部清除
const clearAllBtn = document.createElement("button");
clearAllBtn.type = "button";
clearAllBtn.textContent = "全部清除";
clearAllBtn.className = "text-gray-600 hover:underline";

clearAllBtn.addEventListener("click", e => {
  e.stopPropagation();

  selectedTypes.clear();

  // 取消所有 checkbox
  dropdown.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.checked = false;
  });
  updateSelectAllLabel();
  renderTables();
});

actionBar.appendChild(selectAllBtn);
actionBar.appendChild(clearAllBtn);
dropdown.appendChild(actionBar);

  
// 每個工種 → checkbox
activeWorkTypes.forEach(type => {
  const label = document.createElement("label");
  label.className =
    "flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-100 cursor-pointer";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true; // 預設全選
  checkbox.value = type;
  
  checkbox.addEventListener("click", e => {
    e.stopPropagation();
  });

  dropdown.addEventListener("click", e => {
  e.stopPropagation();
  });
    
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      selectedTypes.add(type);
    } else {
      selectedTypes.delete(type);
    }
    updateSelectAllLabel();
    renderTables();
  });

  const span = document.createElement("span");
  span.textContent = type;

  label.appendChild(checkbox);
  label.appendChild(span);
  dropdown.appendChild(label);
});

// 點擊按鈕 → 開 / 關 dropdown
filterButton.addEventListener("click", e => {
  e.stopPropagation();
  dropdown.classList.toggle("hidden");
});

// 點擊其他地方 → 自動關閉
document.addEventListener("click", () => {
  dropdown.classList.add("hidden");
});

// 掛到頁面
container.appendChild(filterBox);

  const summaryBox = document.createElement("div");
  summaryBox.className = "text-right text-base font-semibold bg-gray-100 py-2 px-4 mb-2";
  container.appendChild(summaryBox);

  const tableContainer = document.createElement("div");
  container.appendChild(tableContainer);

  const updateTag = document.getElementById("update-time");
  if (updateTag) updateTag.textContent = `最後更新日期：${updateDate}`;

  const chineseNumbers = [
    "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"
  ];
    
  function renderTables() {
    tableContainer.innerHTML = "";
    let totalAmount = 0;
    let visibleGroupCount = 0;

    const sortedGroupEntries = Object.entries(groups).sort(([a], [b]) => {
      const indexA = WORKTYPE_ORDER.indexOf(a);
      const indexB = WORKTYPE_ORDER.indexOf(b);

      // 不在清單內的排在最後
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
      
      sortedGroupEntries.forEach(([WorkType, items]) => {
      if (!selectedTypes.has(WorkType) || items.length === 0) return;

    const sortedItems = [...items].sort((a, b) => {
      if (a.Order != null && b.Order != null) return a.Order - b.Order;
      if (a.Order != null) return -1;
      if (b.Order != null) return 1;
      return 0;
      });

      const section = document.createElement("details");
      section.setAttribute("open", "true");
      section.className = "avoid-break";

      const summary = document.createElement("summary");
      summary.className = "mt-4 cursor-pointer font-semibold bg-gray-100 px-4 py-1 rounded";
      summary.textContent = `${chineseNumbers[visibleGroupCount] || (visibleGroupCount + 1)}、${WorkType}`;
      visibleGroupCount++;

      const wrapper = document.createElement("div");
      wrapper.className = "overflow-x-auto mt-1";

      const table = document.createElement("table");
      table.className = "w-full border border-gray-300 text-sm";

      const groupTotal = sortedItems.reduce((sum, item) => sum + (item.Amount ?? 0), 0);
      totalAmount += groupTotal;

            // <th class="border px-2 py-1 text-right w-[65px]">單價</th>
            // <th class="border px-2 py-1 text-right w-[80px]">價格</th>
            // <td class="border px-2 py-1 text-right">${formatMoney(item.UnitPrice)}</td>
            // <td class="border px-2 py-1 text-right">${formatMoney(item.Amount)}</td>
          // <tr class="font-semibold bg-gray-50">
          //   <td colspan="6" class="text-right border px-2 py-1">小計</td>
          //   <td class="border px-2 py-1 text-right">${formatMoney(groupTotal)}</td>
          // </tr>
        
      table.innerHTML = `
        <thead class="bg-gray-100">
          <tr>
            <th class="border px-1 py-1 w-[40px] text-xs">#</th>
            <th class="border px-2 py-1 w-[16%] text-xs">工程項目</th>
            <th class="border px-2 py-1 w-[40%] text-xs">規格描述</th>
            <th class="border px-2 py-1 text-xs">備註／圖面</th>
            <th class="border px-2 py-1 text-right w-[45px] text-xs">數量</th>
            <th class="border px-2 py-1 w-[45px] text-xs">單位</th>
            <th class="border px-2 py-1 w-[80px] text-xs">連結</th>
            </tr>
        </thead>
        <tbody>
          ${sortedItems.map((item, i) => `
            <tr>
              <td class="border px-2 py-1 text-xs text-center">${item.Order}</td>
              <td class="border px-2 py-1 text-xs">${item.Item}</td>
              <td class="border px-2 py-1 text-xs">${item.Spec}</td>
              <td class="border px-2 py-1 text-xs">${item.Note}</td>
              <td class="border px-2 py-1 text-right text-xs ${item.Qty == null ? 'text-gray-400 italic' : ''}">
                ${item.Qty == null ? '待定' : item.Qty}
              </td>
              <td class="border px-2 py-1 text-xs">${item.Unit}</td>
              <td class="border px-2 py-1 text-[10px]">${item.Reference}</td>
            </tr>
          `).join('')}
        </tbody>
      `;

      wrapper.appendChild(table);
      section.appendChild(summary);
      section.appendChild(wrapper);
      tableContainer.appendChild(section);
    });

    // summaryBox.innerHTML = `<strong>金額總計：</strong> ${formatMoney(totalAmount)}`;
  }

  renderTables();
}
