// 從後端 API 取得標單資料，並以群組方式渲染出完整表格
fetch("/api/bid")
  .then(res => {
    if (!res.ok) throw new Error("API 錯誤，狀態碼：" + res.status);
    return res.json();
  })
  .then(data => {
    // 預先過濾掉 Item 為空的資料
    data = data.filter(d => d.Item && d.Item.trim() !== "");
    const grouped = groupBy(data, 'WorkType');
    renderPage(grouped, data);
  })
  .catch(err => {
    const container = document.getElementById('table-container');
    container.innerHTML = `<p class=\"text-red-600\">❌ 資料載入失敗：${err.message}</p>`;
    console.error("❌ 發生錯誤：", err);
  });

// 將資料陣列依照某一屬性分類（例如以 WorkType 分群）
function groupBy(arr, key) {
  return arr.reduce((acc, cur) => {
    const group = cur[key] || "未分類";
    acc[group] = acc[group] || [];
    acc[group].push(cur);
    return acc;
  }, {});
}

// 將金額數值轉換為字串，加入 $ 與千分位逗號
function formatMoney(n) {
  return `$${n.toLocaleString("en-US")}`;
}

// 主渲染函式，負責：篩選器 + 總金額 + 分組表格 + 更新時間
function renderPage(groups, fullData) {
  const container = document.getElementById('table-container');
  container.innerHTML = "";
  const updateDate = fullData[0]?.Updated?.slice(0, 10) || "";

  // 建立按鈕篩選器 UI
  const filterBox = document.createElement("div");
  filterBox.className = "mb-4 flex flex-wrap gap-2 items-center";

  const activeWorkTypes = Object.keys(groups).filter(type => groups[type].length > 0);
  let selectedTypes = new Set(activeWorkTypes);

  activeWorkTypes.forEach(type => {
    const btn = document.createElement("button");
    btn.textContent = type;
    btn.className = "text-sm px-3 py-1 border rounded bg-gray-200 hover:bg-gray-300";
    btn.dataset.type = type;
    btn.dataset.selected = "true";

    btn.addEventListener("click", () => {
      const isSelected = btn.dataset.selected === "true";
      if (isSelected) {
        selectedTypes.delete(type);
        btn.classList.remove("bg-gray-200");
        btn.classList.add("bg-white", "text-gray-400", "line-through");
        btn.dataset.selected = "false";
      } else {
        selectedTypes.add(type);
        btn.classList.remove("bg-white", "text-gray-400", "line-through");
        btn.classList.add("bg-gray-200");
        btn.dataset.selected = "true";
      }
      renderTables();
    });

    filterBox.appendChild(btn);
  });

  container.appendChild(filterBox);

  // 顯示總計區塊
  const summaryBox = document.createElement("div");
  summaryBox.className = "text-right text-base font-semibold bg-gray-100 py-2 px-4 mb-2";
  container.appendChild(summaryBox);

  // 表格容器：各組表格會被渲染進來
  const tableContainer = document.createElement("div");
  container.appendChild(tableContainer);

  // 更新時間區塊固定在右上角
  const updateTag = document.createElement("p");
  updateTag.className = "absolute top-4 right-6 text-xs text-gray-400 print:relative print:top-0 print:right-0 print:text-right";
  updateTag.textContent = `最後更新時間：${updateDate}`;
  container.appendChild(updateTag);

  // 子函式：根據勾選的工種重新渲染表格與總計
  function renderTables() {
    tableContainer.innerHTML = "";
    let totalAmount = 0;

    Object.entries(groups).forEach(([WorkType, items]) => {
      if (!selectedTypes.has(WorkType) || items.length === 0) return;

      const section = document.createElement("details");
      section.setAttribute("open", "true");
      section.className = "avoid-break mt-6";

      const summary = document.createElement("summary");
      summary.className = "cursor-pointer font-semibold bg-gray-100 px-4 py-2 rounded";
      summary.textContent = WorkType;

      const wrapper = document.createElement("div");
      wrapper.className = "overflow-x-auto mt-2";

      const groupTotal = items.reduce((sum, item) => sum + (item.Amount ?? 0), 0);
      totalAmount += groupTotal;

      // 建立表格 HTML 內容
      const table = document.createElement("table");
      table.className = "w-full border border-gray-300 text-sm";
      table.innerHTML = `
        <thead class="bg-gray-100">
          <tr>
            <th class="border px-2 py-1">#</th>
            <th class="border px-2 py-1">工程項目</th>
            <th class="border px-2 py-1">規格描述</th>
            <th class="border px-2 py-1 text-right">數量</th>
            <th class="border px-2 py-1">單位</th>
            <th class="border px-2 py-1 text-right">單價</th>
            <th class="border px-2 py-1 text-right">價格</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, i) => `
            <tr>
              <td class="border px-2 py-1 text-center">${i + 1}</td>
              <td class="border px-2 py-1">${item.Item}</td>
              <td class="border px-2 py-1">${item.Spec}</td>
              <td class="border px-2 py-1 text-right">${item.Qty}</td>
              <td class="border px-2 py-1">${item.Unit}</td>
              <td class="border px-2 py-1 text-right">${formatMoney(item.UnitPrice)}</td>
              <td class="border px-2 py-1 text-right">${formatMoney(item.Amount)}</td>
            </tr>
          `).join('')}
          <tr class="font-semibold bg-gray-50">
            <td colspan="6" class="text-right border px-2 py-1">小計</td>
            <td class="border px-2 py-1 text-right">${formatMoney(groupTotal)}</td>
          </tr>
        </tbody>
      `;

      wrapper.appendChild(table);
      section.appendChild(summary);
      section.appendChild(wrapper);
      tableContainer.appendChild(section);
    });

    // 更新總計欄位內容
    summaryBox.innerHTML = `<strong>金額總計：</strong> ${formatMoney(totalAmount)}`;
  }

  renderTables();
}
