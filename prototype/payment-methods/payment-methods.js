import "../base-path.js";

const paymentMethods = [
  {
    name: "Visa",
    mark: "VISA",
    type: "银行卡",
    countries: ["全球"],
    currencies: ["多币种"],
    description: "覆盖广泛的国际银行卡网络，适用于不同市场的线上支付场景。",
    color: "#17347a",
    background: "#eef2fb",
  },
  {
    name: "Mastercard",
    mark: "mastercard",
    markClass: "compact",
    type: "银行卡",
    countries: ["全球"],
    currencies: ["多币种"],
    description: "连接全球银行卡持卡人，支持主流线上收款体验。",
    color: "#d5442f",
    background: "#fff2ee",
  },
  {
    name: "JCB",
    mark: "JCB",
    type: "银行卡",
    countries: ["日本", "新加坡", "泰国", "中国香港"],
    currencies: ["JPY", "SGD", "THB", "HKD"],
    description: "在日本及亚洲市场广泛使用的国际银行卡品牌。",
    color: "#1f6a53",
    background: "#edf8f4",
  },
  {
    name: "Apple Pay",
    mark: "Apple Pay",
    markClass: "compact",
    type: "数字钱包",
    countries: ["新加坡", "马来西亚", "日本", "韩国", "欧洲", "巴西", "墨西哥"],
    currencies: ["多币种"],
    description: "用户可通过已绑定的银行卡快速完成移动端和网页支付。",
    color: "#252b37",
    background: "#f0f1f3",
  },
  {
    name: "Google Pay",
    mark: "G Pay",
    type: "数字钱包",
    countries: ["新加坡", "马来西亚", "泰国", "日本", "韩国", "欧洲", "巴西"],
    currencies: ["多币种"],
    description: "通过 Google 账户中保存的支付信息完成快速付款。",
    color: "#3569c8",
    background: "#eef4ff",
  },
  {
    name: "GrabPay",
    mark: "GrabPay",
    markClass: "compact",
    type: "数字钱包",
    countries: ["新加坡", "马来西亚"],
    currencies: ["SGD", "MYR"],
    description: "东南亚用户熟悉的移动钱包，适用于日常消费场景。",
    color: "#148a5b",
    background: "#ecf8f2",
  },
  {
    name: "Touch 'n Go eWallet",
    mark: "TNG",
    type: "数字钱包",
    countries: ["马来西亚"],
    currencies: ["MYR"],
    description: "马来西亚常用电子钱包，覆盖线上消费与本地生活服务。",
    color: "#1c62a4",
    background: "#edf5fb",
  },
  {
    name: "GCash",
    mark: "GCash",
    type: "数字钱包",
    countries: ["菲律宾"],
    currencies: ["PHP"],
    description: "菲律宾广泛使用的数字钱包，支持消费者移动支付。",
    color: "#1a66d9",
    background: "#edf4ff",
  },
  {
    name: "DANA",
    mark: "DANA",
    type: "数字钱包",
    countries: ["印度尼西亚"],
    currencies: ["IDR"],
    description: "印度尼西亚主流数字钱包，服务本地线上支付用户。",
    color: "#1880d2",
    background: "#edf7fd",
  },
  {
    name: "OVO",
    mark: "OVO",
    type: "数字钱包",
    countries: ["印度尼西亚"],
    currencies: ["IDR"],
    description: "印度尼西亚常用电子钱包，覆盖多种数字消费场景。",
    color: "#6147a6",
    background: "#f3f0fb",
  },
  {
    name: "PayPay",
    mark: "PayPay",
    type: "数字钱包",
    countries: ["日本"],
    currencies: ["JPY"],
    description: "日本本地常用数字钱包，支持移动端二维码支付。",
    color: "#d94243",
    background: "#fff0f0",
  },
  {
    name: "Kakao Pay",
    mark: "kakao pay",
    markClass: "compact",
    type: "数字钱包",
    countries: ["韩国"],
    currencies: ["KRW"],
    description: "韩国用户熟悉的移动支付服务，连接本地数字生活场景。",
    color: "#4c4021",
    background: "#fff8dc",
  },
  {
    name: "Alipay",
    mark: "Alipay",
    type: "数字钱包",
    countries: ["中国内地", "中国香港"],
    currencies: ["CNY", "HKD"],
    description: "面向中国用户的数字钱包支付方式，适用于线上消费。",
    color: "#1769d4",
    background: "#edf4ff",
  },
  {
    name: "WeChat Pay",
    mark: "WeChat Pay",
    markClass: "compact",
    type: "数字钱包",
    countries: ["中国内地", "中国香港"],
    currencies: ["CNY", "HKD"],
    description: "连接微信生态的移动支付方式，支持二维码和应用内支付。",
    color: "#16895a",
    background: "#ecf8f2",
  },
  {
    name: "PayNow",
    mark: "PayNow",
    markClass: "compact",
    type: "实时支付",
    countries: ["新加坡"],
    currencies: ["SGD"],
    description: "新加坡本地实时支付网络，用户可通过银行应用完成转账。",
    color: "#7a378a",
    background: "#f7eff9",
  },
  {
    name: "FPX",
    mark: "FPX",
    type: "在线网银",
    countries: ["马来西亚"],
    currencies: ["MYR"],
    description: "连接马来西亚本地银行账户的在线网银支付方式。",
    color: "#285f91",
    background: "#edf5fb",
  },
  {
    name: "PromptPay",
    mark: "PromptPay",
    markClass: "compact",
    type: "实时支付",
    countries: ["泰国"],
    currencies: ["THB"],
    description: "泰国本地实时支付网络，支持通过银行应用扫码付款。",
    color: "#39558f",
    background: "#eef2fa",
  },
  {
    name: "QRIS",
    mark: "QRIS",
    type: "实时支付",
    countries: ["印度尼西亚"],
    currencies: ["IDR"],
    description: "印度尼西亚统一二维码标准，连接本地主流支付应用。",
    color: "#b12f35",
    background: "#fff0f1",
  },
  {
    name: "PIX",
    mark: "PIX",
    type: "实时支付",
    countries: ["巴西"],
    currencies: ["BRL"],
    description: "巴西本地实时支付系统，支持账户间快速转账。",
    color: "#1f806f",
    background: "#edf8f5",
  },
  {
    name: "SPEI",
    mark: "SPEI",
    type: "银行转账",
    countries: ["墨西哥"],
    currencies: ["MXN"],
    description: "墨西哥银行间电子支付系统，适用于本地银行转账。",
    color: "#536789",
    background: "#f0f3f8",
  },
  {
    name: "iDEAL",
    mark: "iDEAL",
    type: "在线网银",
    countries: ["欧洲", "荷兰"],
    currencies: ["EUR"],
    description: "荷兰用户常用的银行账户支付方式，通过网银完成授权。",
    color: "#a92767",
    background: "#faeff5",
  },
  {
    name: "BLIK",
    mark: "BLIK",
    type: "实时支付",
    countries: ["欧洲", "波兰"],
    currencies: ["PLN"],
    description: "波兰本地移动支付方式，使用银行应用生成代码完成付款。",
    color: "#cf3d45",
    background: "#fff0f1",
  },
  {
    name: "Konbini",
    mark: "Konbini",
    markClass: "compact",
    type: "现金支付",
    countries: ["日本"],
    currencies: ["JPY"],
    description: "用户在线下单后，可前往日本便利店完成现金付款。",
    color: "#506079",
    background: "#f1f3f6",
  },
  {
    name: "Klarna",
    mark: "Klarna",
    type: "先买后付",
    countries: ["欧洲"],
    currencies: ["EUR", "GBP"],
    description: "为符合条件的消费者提供分期或延后付款选择。",
    color: "#7b334f",
    background: "#fff0f5",
  },
];

const countryGroups = [
  {
    label: "东南亚",
    values: [
      "新加坡",
      "印度尼西亚",
      "马来西亚",
      "菲律宾",
      "泰国",
    ],
  },
  {
    label: "东亚",
    values: [
      "日本",
      "韩国",
      "中国内地",
      "中国香港",
    ],
  },
  {
    label: "北美",
    values: ["美国", "加拿大"],
  },
  {
    label: "拉美",
    values: ["巴西", "墨西哥"],
  },
  {
    label: "欧洲",
    values: ["欧元区", "英国"],
  },
  {
    label: "其他地区",
    values: ["中东", "非洲", "大洋洲"],
  },
];

const typeOrder = [
  "银行卡",
  "数字钱包",
  "实时支付",
  "银行转账",
  "在线网银",
  "现金支付",
  "先买后付",
];

const countrySelect = document.querySelector("[data-country-select]");
const typeSelect = document.querySelector("[data-type-select]");
const searchInput = document.querySelector("[data-search-input]");
const resetButton = document.querySelector("[data-reset-filter]");
const emptyResetButton = document.querySelector("[data-empty-reset]");
const grid = document.querySelector("[data-method-grid]");
const emptyResults = document.querySelector("[data-empty-results]");
const resultSummary = document.querySelector("[data-result-summary]");
const regionPicker = document.querySelector("[data-region-picker]");
const regionTrigger = document.querySelector("[data-region-trigger]");
const regionLabel = document.querySelector("[data-region-label]");
const regionMenu = document.querySelector("[data-region-menu]");
const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".main-nav");

function countryOptionValue(value) {
  return value === "欧元区" ? "欧洲" : value;
}

function appendOptions(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function appendCountryGroups(select, groups) {
  groups.forEach((group) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;

    group.values.forEach((value) => {
      const option = document.createElement("option");
      option.value = countryOptionValue(value);
      option.textContent = value;
      optgroup.append(option);
    });

    select.append(optgroup);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTags(values) {
  const visibleValues = values.slice(0, 4);
  const remaining = values.length - visibleValues.length;
  return [
    ...visibleValues.map((value) => `<span>${escapeHtml(value)}</span>`),
    remaining > 0 ? `<span>+${remaining}</span>` : "",
  ].join("");
}

function closeRegionMenu() {
  regionMenu.hidden = true;
  regionTrigger.setAttribute("aria-expanded", "false");
  regionPicker.classList.remove("open");
}

function renderRegionMenu() {
  const regionGroupsMarkup = countryGroups
    .map(
      (group) => `
        <section class="region-group">
          <strong>${escapeHtml(group.label)}</strong>
          <div>
            ${group.values
              .map((value) => {
                const optionValue = countryOptionValue(value);
                return `
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    data-region-value="${escapeHtml(optionValue)}"
                  >
                    ${escapeHtml(value)}
                  </button>
                `;
              })
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");

  regionMenu.innerHTML = `
    <button
      class="region-all-option"
      type="button"
      role="option"
      aria-selected="true"
      data-region-value="all"
    >
      <span>全部市场</span>
      <small>查看全部支付方式</small>
    </button>
    <div class="region-group-grid">${regionGroupsMarkup}</div>
  `;

  regionMenu.querySelectorAll("[data-region-value]").forEach((button) => {
    button.addEventListener("click", () => {
      countrySelect.value = button.dataset.regionValue;
      closeRegionMenu();
      render();
      regionTrigger.focus();
    });
  });
}

function updateRegionPicker() {
  const selectedOption = countrySelect.selectedOptions[0];
  const selectedLabel = selectedOption?.textContent || "全部市场";
  regionLabel.textContent = selectedLabel;
  regionTrigger.setAttribute("aria-label", `国家或地区，当前选择${selectedLabel}`);

  regionMenu.querySelectorAll("[data-region-value]").forEach((button) => {
    const selected = button.dataset.regionValue === countrySelect.value;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}

function methodCard(method) {
  const markClass = method.markClass ? ` ${method.markClass}` : "";
  return `
    <article class="payment-method-card">
      <div class="method-card-heading">
        <div class="method-identity">
          <div class="method-mark-wrap" style="--mark-bg:${method.background};--mark-color:${method.color}">
            <span class="method-mark${markClass}">${escapeHtml(method.mark)}</span>
          </div>
          <div>
            <h3>${escapeHtml(method.name)}</h3>
            <span class="method-type">${escapeHtml(method.type)}</span>
          </div>
        </div>
      </div>
      <div class="method-card-body">
        <p class="method-description">${escapeHtml(method.description)}</p>
        <div class="method-meta">
          <div class="method-meta-row">
            <span>覆盖市场</span>
            <div class="market-tags">${renderTags(method.countries)}</div>
          </div>
          <div class="method-meta-row">
            <span>币种</span>
            <strong>${escapeHtml(method.currencies.join(" / "))}</strong>
          </div>
        </div>
      </div>
    </article>
  `;
}

function matchesCountry(method, country) {
  if (country === "all") return true;
  return method.countries.includes("全球") || method.countries.includes(country);
}

function getFilteredMethods() {
  const query = searchInput.value.trim().toLowerCase();
  return paymentMethods.filter((method) => {
    const matchesSearch =
      !query ||
      method.name.toLowerCase().includes(query) ||
      method.type.toLowerCase().includes(query);
    const matchesType = typeSelect.value === "all" || method.type === typeSelect.value;
    return matchesSearch && matchesType && matchesCountry(method, countrySelect.value);
  });
}

function render() {
  const results = getFilteredMethods();
  const filterActive =
    countrySelect.value !== "all" ||
    typeSelect.value !== "all" ||
    searchInput.value.trim() !== "";
  resetButton.disabled = !filterActive;
  resultSummary.innerHTML = `找到 <strong>${results.length}</strong> 种支付方式`;
  grid.innerHTML = results.map(methodCard).join("");
  grid.hidden = results.length === 0;
  emptyResults.hidden = results.length > 0;
  updateRegionPicker();
}

function resetFilters() {
  countrySelect.value = "all";
  typeSelect.value = "all";
  searchInput.value = "";
  render();
}

appendCountryGroups(countrySelect, countryGroups);
appendOptions(typeSelect, typeOrder);
renderRegionMenu();

[countrySelect, typeSelect].forEach((select) => {
  select.addEventListener("change", render);
});
searchInput.addEventListener("input", render);
resetButton.addEventListener("click", resetFilters);
emptyResetButton.addEventListener("click", resetFilters);

regionTrigger.addEventListener("click", () => {
  const open = regionMenu.hidden;
  regionMenu.hidden = !open;
  regionTrigger.setAttribute("aria-expanded", String(open));
  regionPicker.classList.toggle("open", open);
});

document.addEventListener("click", (event) => {
  if (!regionPicker.contains(event.target)) {
    closeRegionMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !regionMenu.hidden) {
    closeRegionMenu();
    regionTrigger.focus();
  }
});

menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

render();
