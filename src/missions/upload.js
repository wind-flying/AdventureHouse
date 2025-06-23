// 游戏数据
const gameData = {
  player: {
    money: 100,
    quests: []
  },
  questIdCounter: 1,
  resources: [],
  questTemplates: []
};

// DOM元素引用
const elements = {
  container: null,
  moneyDisplay: null,
  resourceSelect: null,
  rewardInput: null,
  quantityInput: null, // 新增：需求数量输入框引用
  createQuestBtn: null,
  questList: null
};

// 初始化游戏
export async function initGame() {
  // 加载配置
  await loadConfig();
  
  // 创建UI
  createUI();
  
  // 更新UI
  updateUI();
}

// 加载配置文件
async function loadConfig() {
  try {
    // 加载资源配置
    const resourcesResponse = await fetch('./config/resourcesType.json');
    const resourcesData = await resourcesResponse.json();
    gameData.resources = resourcesData.resources;
    
    // 加载任务模板
    const questsResponse = await fetch('./config/quests.json');
    const questsData = await questsResponse.json();
    gameData.questTemplates = questsData.questTemplates;
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

// 创建UI
function createUI() {
  // 创建主容器
  elements.container = document.getElementById('game-container');
  elements.container.classList.add('container');
  
  // 创建标题
  createTitle('任务发布系统');
  
  // 创建玩家状态面板
  createPlayerPanel();
  
  // 创建任务发布面板
  createQuestCreationPanel();
  
  // 创建任务列表面板
  createQuestListPanel();
}

// 创建标题
function createTitle(text) {
  const title = document.createElement('h1');
  title.textContent = text;
  title.classList.add('title');
  elements.container.appendChild(title);
}

// 创建玩家状态面板
function createPlayerPanel() {
  const panel = document.createElement('div');
  panel.classList.add('panel');
  
  const subtitle = document.createElement('h2');
  subtitle.textContent = '玩家状态';
  subtitle.classList.add('subtitle');
  
  const moneyContainer = document.createElement('div');
  moneyContainer.textContent = '金钱: ';
  
  elements.moneyDisplay = document.createElement('span');
  elements.moneyDisplay.id = 'money-display';
  
  moneyContainer.appendChild(elements.moneyDisplay);
  panel.appendChild(subtitle);
  panel.appendChild(moneyContainer);
  elements.container.appendChild(panel);
}

// 创建任务发布面板
function createQuestCreationPanel() {
  const panel = document.createElement('div');
  panel.classList.add('panel');
  
  const subtitle = document.createElement('h2');
  subtitle.textContent = '发布新任务';
  subtitle.classList.add('subtitle');
  
  // 资源选择
  const resourceContainer = document.createElement('div');
  const resourceLabel = document.createElement('label');
  resourceLabel.textContent = '资源类型:';
  resourceContainer.appendChild(resourceLabel);
  
  elements.resourceSelect = document.createElement('select');
  elements.resourceSelect.id = 'resource-select';
  
  // 使用配置中的资源
  gameData.resources.forEach(resource => {
    const option = document.createElement('option');
    option.value = resource.id;
    option.textContent = `${resource.icon} ${resource.name}`;
    elements.resourceSelect.appendChild(option);
  });
  
  resourceContainer.appendChild(elements.resourceSelect);
  
  // 奖励输入
  const rewardContainer = document.createElement('div');
  const rewardLabel = document.createElement('label');
  rewardLabel.textContent = '奖励金额:';
  rewardContainer.appendChild(rewardLabel);
  
  elements.rewardInput = document.createElement('input');
  elements.rewardInput.id = 'reward-input';
  elements.rewardInput.type = 'number';
  elements.rewardInput.value = 3;
  elements.rewardInput.min = 1;
  
  rewardContainer.appendChild(elements.rewardInput);

  // 需求数量输入
  const quantityContainer = document.createElement('div');
  const quantityLabel = document.createElement('label');
  quantityLabel.textContent = '需求数量:';
  quantityContainer.appendChild(quantityLabel);

  elements.quantityInput = document.createElement('input');
  elements.quantityInput.id = 'quantity-input';
  elements.quantityInput.type = 'number';
  elements.quantityInput.value = 1;
  elements.quantityInput.min = 1;

  quantityContainer.appendChild(elements.quantityInput);
  
  // 创建按钮
  elements.createQuestBtn = document.createElement('button');
  elements.createQuestBtn.id = 'create-quest-btn';
  elements.createQuestBtn.textContent = '发布任务';
  elements.createQuestBtn.addEventListener('click', createQuest);
  
  panel.appendChild(subtitle);
  panel.appendChild(resourceContainer);
  panel.appendChild(rewardContainer);
  panel.appendChild(quantityContainer); // 新增：添加需求数量输入框到面板
  panel.appendChild(elements.createQuestBtn);
  elements.container.appendChild(panel);
}

// 创建任务列表面板
function createQuestListPanel() {
  const panel = document.createElement('div');
  panel.classList.add('panel');
  
  const subtitle = document.createElement('h2');
  subtitle.textContent = '当前任务';
  subtitle.classList.add('subtitle');
  
  elements.questList = document.createElement('div');
  elements.questList.id = 'quest-list';
  
  panel.appendChild(subtitle);
  panel.appendChild(elements.questList);
  elements.container.appendChild(panel);
}

// 创建任务
function createQuest() {
  const resourceId = elements.resourceSelect.value;
  const reward = parseInt(elements.rewardInput.value);
  const quantity = parseInt(elements.quantityInput.value); // 新增：获取需求数量

  // 验证输入
  if (isNaN(reward) || reward < 1) {
    showNotification('奖励必须是大于0的数字！', 'error');
    return;
  }

  if (isNaN(quantity) || quantity < 1) {
    showNotification('需求数量必须是大于0的数字！', 'error');
    return;
  }
  
  // 检查金钱是否足够
  if (gameData.player.money < reward) {
    showNotification('金钱不足，无法发布任务！', 'error');
    return;
  }
  
  // 获取资源信息
  const resource = gameData.resources.find(r => r.id === resourceId);
  
  // 创建新任务
  const newQuest = {
    id: gameData.questIdCounter++,
    resource: resource.id,
    resourceName: resource.name,
    resourceIcon: resource.icon,
    reward,
    quantity, // 新增：保存需求数量到任务对象
    status: 'pending',
    adventurer: null
  };
  
  // 从玩家账户扣除奖励
  gameData.player.money -= reward;
  
  // 添加到任务列表
  gameData.player.quests.push(newQuest);
  
  // 更新UI
  updateUI();
  
  // 显示成功消息
  showNotification(`成功发布任务：收集${quantity}个${resource.icon}${resource.name}，奖励${reward}钱！`, 'success');
}

// 更新UI
function updateUI() {
  // 更新金钱显示
  elements.moneyDisplay.textContent = `${gameData.player.money} 钱`;
  
  // 更新任务列表
  elements.questList.innerHTML = '';
  
  if (gameData.player.quests.length === 0) {
    const emptyText = document.createElement('p');
    emptyText.textContent = '暂无任务';
    elements.questList.appendChild(emptyText);
    return;
  }
  
  gameData.player.quests.forEach(quest => {
    const questElement = createQuestElement(quest);
    elements.questList.appendChild(questElement);
  });
}

// 创建任务元素
function createQuestElement(quest) {
  const questElement = document.createElement('div');
  questElement.classList.add('quest', quest.status);
  
  questElement.innerHTML = `
    <div>任务ID: ${quest.id}</div>
    <div>收集资源: ${quest.quantity}个${quest.resourceIcon} ${quest.resourceName}</div> <!-- 新增：显示需求数量 -->
    <div>奖励: ${quest.reward}钱</div>
    <div>状态: ${getStatusText(quest.status)}</div>
    ${quest.adventurer ? `<div>承接者: 冒险者${quest.adventurer}</div>` : ''}
  `;
  
  return questElement;
}

// 获取状态文本
function getStatusText(status) {
  switch (status) {
    case 'pending': return '等待承接';
    case 'active': return '进行中';
    case 'completed': return '已完成';
    default: return status;
  }
}

// 显示通知
function showNotification(message, type = 'info') {
  // 移除之前的通知
  const oldNotifications = document.querySelectorAll('.notification');
  oldNotifications.forEach(notification => {
    notification.remove();
  });
  
  // 创建新通知
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 显示通知
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // 3秒后隐藏并移除
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}
