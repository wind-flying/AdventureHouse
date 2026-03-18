import "./style.css";
import questsData from "../config/quests.json";
import resourcesData from "../config/resourcesType.json";

type Difficulty = "easy" | "medium" | "hard";
type QuestStatus = "pending" | "active" | "completed";

interface ResourceDefinition {
  id: string;
  name: string;
  icon: string;
}

interface QuestTemplate {
  resource: string;
  minReward: number;
  maxReward: number;
  difficulty: Difficulty;
}

interface Quest {
  id: number;
  resource: string;
  resourceName: string;
  resourceIcon: string;
  reward: number;
  quantity: number;
  status: QuestStatus;
  createdDay: number;
  acceptedDay: number | null;
  completedDay: number | null;
  totalDays: number;
  daysRemaining: number;
}

interface GameData {
  day: number;
  player: {
    money: number;
    quests: Quest[];
    stock: Record<string, number>;
  };
  questIdCounter: number;
  dailyShopIncome: number;
  resources: ResourceDefinition[];
  questTemplates: QuestTemplate[];
  dayLog: string[];
}

interface Elements {
  container: HTMLDivElement | null;
  dayDisplay: HTMLSpanElement | null;
  moneyDisplay: HTMLSpanElement | null;
  stockDisplay: HTMLDivElement | null;
  logList: HTMLDivElement | null;
  resourceSelect: HTMLSelectElement | null;
  rewardInput: HTMLInputElement | null;
  quantityInput: HTMLInputElement | null;
  durationHint: HTMLParagraphElement | null;
  createQuestBtn: HTMLButtonElement | null;
  nextDayBtn: HTMLButtonElement | null;
  questList: HTMLDivElement | null;
}

const resources = resourcesData.resources as ResourceDefinition[];
const questTemplates = questsData.questTemplates as QuestTemplate[];

const gameData: GameData = {
  day: 1,
  player: {
    money: 120,
    quests: [],
    stock: Object.fromEntries(resources.map((resource) => [resource.id, 0]))
  },
  questIdCounter: 1,
  dailyShopIncome: 6,
  resources,
  questTemplates,
  dayLog: [
    "村里的小店今天正式开门。你能靠委托补货，也能靠日常营业维持现金流。"
  ]
};

const elements: Elements = {
  container: null,
  dayDisplay: null,
  moneyDisplay: null,
  stockDisplay: null,
  logList: null,
  resourceSelect: null,
  rewardInput: null,
  quantityInput: null,
  durationHint: null,
  createQuestBtn: null,
  nextDayBtn: null,
  questList: null
};

initGame();

function initGame() {
  createUI();
  syncQuestForm();
  render();
}

function createUI() {
  const container = document.getElementById("game-container");
  if (!(container instanceof HTMLDivElement)) {
    throw new Error("Missing #game-container root element.");
  }

  elements.container = container;
  container.className = "app-shell";
  container.innerHTML = "";

  const header = document.createElement("header");
  header.className = "hero";
  header.innerHTML = `
    <div>
      <p class="eyebrow">Adventure House</p>
      <h1>村庄据点原型</h1>
      <p class="hero-copy">第一版先验证按天推进、任务结算和基础经营循环。</p>
    </div>
  `;

  const overviewGrid = document.createElement("section");
  overviewGrid.className = "overview-grid";

  const timePanel = document.createElement("section");
  timePanel.className = "panel";
  timePanel.innerHTML = `
    <div class="panel-head">
      <h2>时间推进</h2>
      <p>游戏采用手动进入下一天的离散结算。</p>
    </div>
    <div class="stat-row">
      <span>当前日期</span>
      <strong id="day-display"></strong>
    </div>
    <div class="stat-row">
      <span>日常营业收入</span>
      <strong>${gameData.dailyShopIncome} 钱 / 天</strong>
    </div>
    <button id="next-day-btn" class="primary-button" type="button">进入下一天</button>
  `;

  const playerPanel = document.createElement("section");
  playerPanel.className = "panel";
  playerPanel.innerHTML = `
    <div class="panel-head">
      <h2>据点状态</h2>
      <p>当前只保留最基础的现金流和库存展示。</p>
    </div>
    <div class="stat-row">
      <span>可用资金</span>
      <strong id="money-display"></strong>
    </div>
    <div>
      <h3 class="mini-title">库存</h3>
      <div id="stock-display" class="stock-list"></div>
    </div>
  `;

  overviewGrid.append(timePanel, playerPanel);

  const contentGrid = document.createElement("section");
  contentGrid.className = "content-grid";

  const creationPanel = document.createElement("section");
  creationPanel.className = "panel";
  creationPanel.innerHTML = `
    <div class="panel-head">
      <h2>发布任务</h2>
      <p>当前先保留资源委托模型，并补上预估耗时。</p>
    </div>
    <label class="field">
      <span>资源类型</span>
      <select id="resource-select"></select>
    </label>
    <label class="field">
      <span>奖励金额</span>
      <input id="reward-input" type="number" min="1" />
    </label>
    <label class="field">
      <span>需求数量</span>
      <input id="quantity-input" type="number" min="1" value="1" />
    </label>
    <p id="duration-hint" class="hint"></p>
    <button id="create-quest-btn" class="primary-button" type="button">发布任务</button>
  `;

  const questPanel = document.createElement("section");
  questPanel.className = "panel";
  questPanel.innerHTML = `
    <div class="panel-head">
      <h2>当前任务</h2>
      <p>任务会在每天推进时从待接取变成进行中，再逐步完成。</p>
    </div>
    <div id="quest-list" class="quest-list"></div>
  `;

  const logPanel = document.createElement("section");
  logPanel.className = "panel panel-wide";
  logPanel.innerHTML = `
    <div class="panel-head">
      <h2>每日记录</h2>
      <p>这里用于展示离散时间推进后的反馈碎片。</p>
    </div>
    <div id="log-list" class="log-list"></div>
  `;

  contentGrid.append(creationPanel, questPanel);

  container.append(header, overviewGrid, contentGrid, logPanel);

  elements.dayDisplay = container.querySelector("#day-display");
  elements.moneyDisplay = container.querySelector("#money-display");
  elements.stockDisplay = container.querySelector("#stock-display");
  elements.logList = container.querySelector("#log-list");
  elements.resourceSelect = container.querySelector("#resource-select");
  elements.rewardInput = container.querySelector("#reward-input");
  elements.quantityInput = container.querySelector("#quantity-input");
  elements.durationHint = container.querySelector("#duration-hint");
  elements.createQuestBtn = container.querySelector("#create-quest-btn");
  elements.nextDayBtn = container.querySelector("#next-day-btn");
  elements.questList = container.querySelector("#quest-list");

  populateResourceOptions();

  elements.resourceSelect?.addEventListener("change", syncQuestForm);
  elements.quantityInput?.addEventListener("input", syncQuestForm);
  elements.createQuestBtn?.addEventListener("click", createQuest);
  elements.nextDayBtn?.addEventListener("click", advanceDay);
}

function populateResourceOptions() {
  if (!elements.resourceSelect) {
    return;
  }

  elements.resourceSelect.innerHTML = "";
  gameData.resources.forEach((resource) => {
    const option = document.createElement("option");
    option.value = resource.id;
    option.textContent = `${resource.icon} ${resource.name}`;
    elements.resourceSelect?.appendChild(option);
  });
}

function syncQuestForm() {
  if (!elements.resourceSelect || !elements.rewardInput || !elements.quantityInput || !elements.durationHint) {
    return;
  }

  const resourceId = elements.resourceSelect.value;
  const quantity = Math.max(1, Number.parseInt(elements.quantityInput.value || "1", 10));
  const recommendedReward = getRecommendedReward(resourceId, quantity);
  const estimatedDays = getEstimatedDays(resourceId, quantity);

  elements.quantityInput.value = String(quantity);
  elements.rewardInput.value = String(recommendedReward);
  elements.durationHint.textContent = `预估耗时：${estimatedDays} 天。当前版本中，任务会在次日被接取，然后按天推进。`;
}

function getTemplate(resourceId: string) {
  return gameData.questTemplates.find((template) => template.resource === resourceId);
}

function getRecommendedReward(resourceId: string, quantity: number) {
  const template = getTemplate(resourceId);
  if (!template) {
    return Math.max(2, quantity * 2);
  }

  const averageReward = Math.round((template.minReward + template.maxReward) / 2);
  return Math.max(1, averageReward * quantity);
}

function getEstimatedDays(resourceId: string, quantity: number) {
  const template = getTemplate(resourceId);
  const difficultyOffset: Record<Difficulty, number> = {
    easy: 0,
    medium: 1,
    hard: 2
  };

  const baseDays = template ? 1 + difficultyOffset[template.difficulty] : 1;
  return baseDays + Math.floor((quantity - 1) / 2);
}

function createQuest() {
  if (!elements.resourceSelect || !elements.rewardInput || !elements.quantityInput) {
    return;
  }

  const resourceId = elements.resourceSelect.value;
  const reward = Number.parseInt(elements.rewardInput.value, 10);
  const quantity = Number.parseInt(elements.quantityInput.value, 10);

  if (Number.isNaN(reward) || reward < 1) {
    showNotification("奖励必须是大于 0 的数字。", "error");
    return;
  }

  if (Number.isNaN(quantity) || quantity < 1) {
    showNotification("需求数量必须是大于 0 的数字。", "error");
    return;
  }

  if (gameData.player.money < reward) {
    showNotification("资金不足，无法发布这份任务。", "error");
    return;
  }

  const resource = gameData.resources.find((item) => item.id === resourceId);
  if (!resource) {
    showNotification("未找到对应的资源配置。", "error");
    return;
  }

  const estimatedDays = getEstimatedDays(resourceId, quantity);

  const newQuest: Quest = {
    id: gameData.questIdCounter++,
    resource: resource.id,
    resourceName: resource.name,
    resourceIcon: resource.icon,
    reward,
    quantity,
    status: "pending",
    createdDay: gameData.day,
    acceptedDay: null,
    completedDay: null,
    totalDays: estimatedDays,
    daysRemaining: estimatedDays
  };

  gameData.player.money -= reward;
  gameData.player.quests.unshift(newQuest);
  gameData.dayLog.unshift(
    `第 ${gameData.day} 天：你发布了收集 ${quantity} 个 ${resource.icon}${resource.name} 的委托，悬赏 ${reward} 钱。`
  );

  render();
  showNotification("任务已发布，等待下一天推进。", "success");
}

function advanceDay() {
  gameData.day += 1;
  gameData.player.money += gameData.dailyShopIncome;

  const nextDayEntries: string[] = [
    `第 ${gameData.day} 天：店铺完成日常营业，获得 ${gameData.dailyShopIncome} 钱。`
  ];

  gameData.player.quests.forEach((quest) => {
    if (quest.status === "completed") {
      return;
    }

    if (quest.status === "pending") {
      quest.status = "active";
      quest.acceptedDay = gameData.day;
      nextDayEntries.push(
        `任务 #${quest.id} 已被人接下，目标是带回 ${quest.quantity} 个 ${quest.resourceIcon}${quest.resourceName}。`
      );
      return;
    }

    quest.daysRemaining -= 1;

    if (quest.daysRemaining <= 0) {
      quest.status = "completed";
      quest.completedDay = gameData.day;
      gameData.player.stock[quest.resource] = (gameData.player.stock[quest.resource] ?? 0) + quest.quantity;
      nextDayEntries.push(
        `任务 #${quest.id} 完成，你的库存增加了 ${quest.quantity} 个 ${quest.resourceIcon}${quest.resourceName}。`
      );
      return;
    }

    nextDayEntries.push(
      `任务 #${quest.id} 继续进行中，预计还需 ${quest.daysRemaining} 天。`
    );
  });

  if (gameData.player.quests.length === 0) {
    nextDayEntries.push("今天没有新的委托变化，店里主要靠常规营业维持运转。");
  }

  gameData.dayLog = [...nextDayEntries, ...gameData.dayLog].slice(0, 12);
  render();
}

function render() {
  renderHeader();
  renderStock();
  renderQuestList();
  renderLog();
}

function renderHeader() {
  if (elements.dayDisplay) {
    elements.dayDisplay.textContent = `第 ${gameData.day} 天`;
  }

  if (elements.moneyDisplay) {
    elements.moneyDisplay.textContent = `${gameData.player.money} 钱`;
  }
}

function renderStock() {
  if (!elements.stockDisplay) {
    return;
  }

  elements.stockDisplay.innerHTML = "";

  gameData.resources.forEach((resource) => {
    const item = document.createElement("div");
    item.className = "stock-item";
    const amount = gameData.player.stock[resource.id] ?? 0;
    item.innerHTML = `<span>${resource.icon} ${resource.name}</span><strong>${amount}</strong>`;
    elements.stockDisplay?.appendChild(item);
  });
}

function renderQuestList() {
  if (!elements.questList) {
    return;
  }

  elements.questList.innerHTML = "";

  if (gameData.player.quests.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "还没有发布任何任务。";
    elements.questList.appendChild(empty);
    return;
  }

  gameData.player.quests.forEach((quest) => {
    const questElement = document.createElement("article");
    questElement.className = `quest-card ${quest.status}`;

    const progressText =
      quest.status === "pending"
        ? "将在下一天开始尝试被接取"
        : quest.status === "active"
          ? `剩余 ${quest.daysRemaining} 天`
          : `已于第 ${quest.completedDay} 天完成`;

    questElement.innerHTML = `
      <div class="quest-head">
        <strong>任务 #${quest.id}</strong>
        <span class="status-pill ${quest.status}">${getStatusText(quest.status)}</span>
      </div>
      <p class="quest-body">收集 ${quest.quantity} 个 ${quest.resourceIcon}${quest.resourceName}</p>
      <div class="quest-meta">
        <span>悬赏 ${quest.reward} 钱</span>
        <span>预计总耗时 ${quest.totalDays} 天</span>
      </div>
      <div class="quest-meta">
        <span>发布于第 ${quest.createdDay} 天</span>
        <span>${progressText}</span>
      </div>
    `;

    elements.questList?.appendChild(questElement);
  });
}

function renderLog() {
  if (!elements.logList) {
    return;
  }

  elements.logList.innerHTML = "";

  gameData.dayLog.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "log-entry";
    item.textContent = entry;
    elements.logList?.appendChild(item);
  });
}

function getStatusText(status: QuestStatus) {
  switch (status) {
    case "pending":
      return "等待接取";
    case "active":
      return "进行中";
    case "completed":
      return "已完成";
    default:
      return status;
  }
}

function showNotification(message: string, type: "info" | "success" | "error" = "info") {
  const oldNotifications = document.querySelectorAll(".notification");
  oldNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.classList.add("visible");
  });

  window.setTimeout(() => {
    notification.classList.remove("visible");
    window.setTimeout(() => notification.remove(), 250);
  }, 2200);
}
