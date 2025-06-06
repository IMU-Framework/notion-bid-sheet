fetch("/api/bid")
  .then(res => {
    if (!res.ok) throw new Error("API 錯誤，狀態碼：" + res.status);
    return res.json();
  })
  .then(({ dbTitle, items }) => {
  document.title = dbTitle;
  document.querySelector("h1").textContent = dbTitle;
    const grouped = groupBy(items, 'WorkType');
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

  const filterBox = document.createElement("div");
  filterBox.className = "mb-4 flex flex-wrap gap-2 items-center";

  const activeWorkTypes = Object.keys(groups).filter(type => groups[type].length > 0);
  let selectedTypes = new Set(activeWorkTypes);

  activeWorkTypes.forEach(type => {
    const button = document.createElement("button");
    button.textContent = type;
    button.className = "px-3 py-1 text-sm rounded bg-gray-200";
    button.dataset.type = type;

    button.addEventListener("click", () => {
      if (selectedTypes.has(type)) {
        selectedTypes.delete(type);
        button.classList.add("line-through", "opacity-50");
      } else {
        selectedTypes.add(type);
        button.classList.remove("line-through", "opacity-50");
      }
      renderTables();
    });

    filterBox.appendChild(button);
  });

  container.appendChild(filterBox);

  const summaryBox = document.createElement("div");
  summaryBox.className = "text-right text-base font-semibold bg-gray-100 py-2 px-4 mb-2";
  container.appendChild(summaryBox);

  const tableContainer = document.createElement("div");
  container.appendChild(tableContainer);

  const updateTag = document.createElement("p");
  updateTag.className = "text-xs text-gray-400 text-right sticky top-0 z-50 bg-white pr-4";
  updateTag.textContent = `最後更新時間：${updateDate}`;
  container.appendChild(updateTag);

  function renderTables() {
    tableContainer.innerHTML = "";
    let totalAmount = 0;

    Object.entries(groups).forEach(([WorkType, items]) => {
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
      summary.textContent = WorkType;

      const wrapper = document.createElement("div");
      wrapper.className = "overflow-x-auto mt-1";

      const table = document.createElement("table");
      table.className = "w-full border border-gray-300 text-sm";

      const groupTotal = sortedItems.reduce((sum, item) => sum + (item.Amount ?? 0), 0);
      totalAmount += groupTotal;

      table.innerHTML = `
        <thead class="bg-gray-100">
          <tr>
            <th class="border px-2 py-1 w-[20px]">#</th>
            <th class="border px-2 py-1 min-w-[4em] w-[16%]">工程項目</th>
            <th class="border px-2 py-1 w-[35%]">規格描述</th>
            <th class="border px-2 py-1 text-right w-[45px]">數量</th>
            <th class="border px-2 py-1 w-[40px]">單位</th>
            <th class="border px-2 py-1 text-right w-[65px]">單價</th>
            <th class="border px-2 py-1 text-right w-[80px]">價格</th>
          </tr>
        </thead>
        <tbody>
          ${sortedItems.map((item, i) => `
            <tr>
              <td class="border px-2 py-1 text-center">${i + 1}</td>
              <td class="border px-2 py-1">${item.Item}</td>
              <td class="border px-2 py-1">${item.Spec}</td>
              <td class="border px-2 py-1 text-right ${item.Qty == null ? 'text-gray-400 italic' : ''}">${item.Qty == null ? '待定' : item.Qty}</td>
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

    summaryBox.innerHTML = `<strong>金額總計：</strong> ${formatMoney(totalAmount)}`;
  }

  renderTables();
}
