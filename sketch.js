let spriteSheet;
let jumpSheet;
let spriteSheet2; // 第二個角色的圖片精靈

let walkFrames = 4; // 圖片精靈中的影格總數
let allFrames2 = 6; // 第二個角色圖片精靈的影格總數
let scaleFactor = 3; // 角色1的放大倍率
let scaleFactor2;    // 角色2的放大倍率 (將在 setup 中計算)

// --- 角色 1 (原始角色) 變數 ---
let charX, charY; // 角色的位置
let speed = 4;    // 角色的移動速度
let direction = 1; // 角色的方向 (1: 右, -1: 左)
let isMoving = false; // 角色是否正在移動
let canBeHit = true; // 角色1是否可以被擊中
let char1MaxHP = 100; // 角色1最大血量
let char1HP = 100;    // 角色1目前血量

// --- 角色 2 (新角色) 變數 ---
let char2X, char2Y;
let speed2 = 4;
let direction2 = 1; // 預設向右
let isMoving2 = false;
let velocityY2 = 0;
let isOnGround2 = false;


// --- 跳躍物理變數 ---
let velocityY = 0;    // 垂直速度
let gravity = 0.6;    // 重力大小
let jumpForce = -18;  // 向上跳躍的力道 (y 軸向上為負)
let isOnGround = false; // 角色是否在地面上

let jumpFrames = 6; // jump.png 實際上有 6 個影格

// --- 對話變數 ---
let char1Input; // 角色1的輸入框
let char1Speech = ''; // 角色1說的話

// --- 題庫變數 ---
let questionBank; // 儲存從 CSV 載入的題庫表格
let currentQuestion = null; // 當前顯示的題目物件
let dialogueState = 'idle'; // 對話狀態: 'idle', 'asking', 'feedback'
let character2Dialogue = ''; // 角色2當前要顯示的文字
let feedbackTimer = 0; // 【此變數將不再用於控制流程，但保留以便未來使用】
let retryButton; // 再作答一次的按鈕
let nextButton; // 下一題的按鈕

// 在 setup() 之前預先載入圖片資源
function preload() {
  // 確保路徑 '1/walk/walk.png' 是相對於您的 index.html 檔案的正確路徑
  spriteSheet = loadImage('1/walk/walk.png');
  jumpSheet = loadImage('1/jump/jump.png');
  // 載入第二個角色的圖片
  spriteSheet2 = loadImage('2/all.png');
  // 載入 CSV 題庫檔案，'header' 表示第一行為欄位名稱
  questionBank = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  // 建立一個 2000x2000 的畫布
  createCanvas(2000, 2000);

  // 初始化角色位置在畫布中央
  charX = width / 2;
  charY = height / 4; // 將角色上移

  // 初始化新角色位置在畫布左側
  char2X = width / 4;
  char2Y = height / 4; // 將角色上移

  // 移除圖片的綠色背景
  spriteSheet.loadPixels();
  for (let i = 0; i < spriteSheet.pixels.length; i += 4) {
    let r = spriteSheet.pixels[i];
    let g = spriteSheet.pixels[i + 1];
    let b = spriteSheet.pixels[i + 2];
    // 檢查是否為螢光綠 (R=0, G=255, B=0)
    if (r === 0 && g === 255 && b === 0) {
      // 將其 Alpha 值設為 0 (完全透明)
      spriteSheet.pixels[i + 3] = 0;
    }
  }
  spriteSheet.updatePixels();

  // 移除跳躍圖片的綠色背景
  jumpSheet.loadPixels();
  for (let i = 0; i < jumpSheet.pixels.length; i += 4) {
    let r = jumpSheet.pixels[i];
    let g = jumpSheet.pixels[i + 1];
    let b = jumpSheet.pixels[i + 2];
    if (r === 0 && g === 255 && b === 0) {
      jumpSheet.pixels[i + 3] = 0;
    }
  }
  jumpSheet.updatePixels();

  // 移除角色 2 圖片的黑色背景
  spriteSheet2.loadPixels();
  for (let i = 0; i < spriteSheet2.pixels.length; i += 4) {
    let r = spriteSheet2.pixels[i];
    let g = spriteSheet2.pixels[i + 1];
    let b = spriteSheet2.pixels[i + 2];
    if (r === 0 && g === 0 && b === 0) {
      // 將其 Alpha 值設為 0 (完全透明)
      spriteSheet2.pixels[i + 3] = 0;
    }
  }
  spriteSheet2.updatePixels();

  // --- 計算縮放比例，讓兩個角色寬度一致 ---
  let frameWidth1 = spriteSheet.width / walkFrames;
  let frameWidth2 = spriteSheet2.width / allFrames2;
  // 根據角色1的寬度和縮放，計算角色2需要的縮放因子
  // (角色1的最終寬度) / (角色2的原始寬度) = 角色2的縮放因子
  scaleFactor2 = (frameWidth1 * scaleFactor) / frameWidth2;

  // 建立角色1的輸入框
  char1Input = createInput('');
  char1Input.position(10, height - 40); // 放置在畫布左下角
  char1Input.size(150); // 縮短輸入框長度，避免擋住題目
  char1Input.input(updateChar1Speech); // 當輸入框內容改變時呼叫函數
  char1Input.hide(); // 預設隱藏

  // 建立互動按鈕
  retryButton = createButton('再作答一次');
  retryButton.hide();
  retryButton.mousePressed(retryQuestion);

  nextButton = createButton('下一題');
  nextButton.hide();
  nextButton.mousePressed(nextQuestion);

  // 設定動畫播放速度 (每秒的影格數)
  // 數值越小，動畫越慢
  frameRate(60);

  // 將圖片的繪製基準點設為中心
  imageMode(CENTER);
}

function updateChar1Speech() {
  char1Speech = this.value();
}

function submitAnswer() {
  // 當按下 Enter 且正在提問時，檢查答案
  if (dialogueState === 'asking') {
    const userAnswer = char1Input.value().trim();
    checkAnswer(userAnswer);
  }
}

function draw() {
  // 設定畫布背景顏色
  background('#415a77');
  rectMode(CORNER); // 重置 rectMode 以免影響其他繪圖
  
  // 繪製角色1的血條
  drawHPBar();

  // 如果血量歸零，顯示遊戲結束並停止一切活動
  if (char1HP <= 0) {
    displayGameOver();
    return; // 停止執行後續的 draw 內容
  }

  // --- 角色 1: 控制邏輯 (方向鍵) ---
  isMoving = false; // 重置移動狀態
  if (keyIsDown(LEFT_ARROW)) {
    charX -= speed;
    direction = -1;
    isMoving = true;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    charX += speed;
    direction = 1;
    isMoving = true;
  }

  // --- 角色 2: 控制邏輯 (A, D 鍵) ---
  isMoving2 = false; // 重置移動狀態
  if (keyIsDown(65)) { // 'A' 鍵
    char2X -= speed2;
    direction2 = -1;
    isMoving2 = true;
  }
  if (keyIsDown(68)) { // 'D' 鍵
    char2X += speed2;
    direction2 = 1;
    isMoving2 = true;
  }

  // --- 角色 1: 物理更新 ---
  // 1. 將重力加到垂直速度上
  velocityY += gravity;
  // 2. 根據速度更新 y 座標
  charY += velocityY;

  // 3. 檢查是否接觸地面 (畫布高度的一半)
  if (charY >= height / 4) {
    charY = height / 4; // 確保角色不會掉到地面以下
    velocityY = 0;    // 停止下墜
    isOnGround = true;
  } else {
    isOnGround = false;
  }

  // --- 角色 2: 物理更新 ---
  velocityY2 += gravity;
  char2Y += velocityY2;
  if (char2Y >= height / 4) {
    char2Y = height / 4;
    velocityY2 = 0;
    isOnGround2 = true;
  } else {
    isOnGround2 = false;
  }

  // --- 角色 1: 邊界偵測 ---
  // 計算角色的半寬，以確保角色的邊緣不會超出畫布
  let charHalfWidth = (Math.round(155 / walkFrames) * scaleFactor) / 2;
  // 使用 constrain() 函式將角色的 x 座標限制在畫布範圍內
  charX = constrain(charX, charHalfWidth, width - charHalfWidth);

  // --- 角色 2: 邊界偵測 ---
  let char2HalfWidth = (spriteSheet2.width / allFrames2 * scaleFactor) / 2;
  char2X = constrain(char2X, char2HalfWidth, width - char2HalfWidth);

  // --- 角色 1: 動畫邏輯 ---
  let currentSheet, frameWidth, sHeight, currentFrame;

  if (isOnGround) {
    // 在地面上：使用走路/站立動畫
    currentSheet = spriteSheet;
    frameWidth = currentSheet.width / walkFrames;
    sHeight = currentSheet.height;
    if (isMoving) {
      // 走路動畫
      currentFrame = floor((frameCount / 8) % walkFrames);
    } else {
      // 站立不動，停在第一格
      currentFrame = 0;
    }
  } else {
    // 在空中：使用跳躍動畫
    currentSheet = jumpSheet;
    frameWidth = currentSheet.width / jumpFrames;
    sHeight = currentSheet.height;
    // 在空中時，固定使用第三個影格 (索引值為 2) 作為跳躍姿勢
    currentFrame = 2;
  }

  // 計算要從圖片精靈中擷取的 x 座標
  let sx = currentFrame * frameWidth;
  let sy = 0; // y 座標為 0，因為所有影格都在同一列
  let sWidth = frameWidth;
  
  // 1. 使用 get() 精確擷取目前影格的圖片
  let frameImage = currentSheet.get(Math.round(sx), sy, Math.round(sWidth), sHeight);

  // --- 角色 1: 繪圖邏輯 ---
  push(); // 儲存目前的繪圖設定
  translate(charX, charY); // 將畫布的原點移動到角色的位置
  scale(direction, 1); // 根據方向翻轉 x 軸 (direction 為 -1 時會水平翻轉)

  // 2. 將擷取到的影格繪製在新原點 (0,0) 上
  // 因為 imageMode 是 CENTER，所以圖片會以 (0,0) 為中心繪製
  image(
    frameImage,
    0, // 相對於新的原點 (charX, charY)
    0, // 相對於新的原點 (charX, charY)
    Math.round(sWidth) * scaleFactor,
    sHeight * scaleFactor
  );
  pop(); // 恢復原本的繪圖設定

  // --- 角色 2: 動畫與繪圖邏輯 ---
  let frameWidth2 = spriteSheet2.width / allFrames2;
  let sHeight2 = spriteSheet2.height;
  let currentFrame2;

  // --- 角色互動邏輯 ---
  let distance = abs(charX - char2X); // 計算兩個角色之間的水平距離
  let proximityThreshold = 150; // 當距離小於這個值時，觸發互動
  let isPlayer1Near = distance < proximityThreshold;

  // 根據是否靠近來顯示/隱藏輸入框
  // 並將輸入框移動到角色1的頭頂
  if (isPlayer1Near) {
    // 計算角色1的顯示高度，用於定位輸入框
    let char1DisplayedHeight = sHeight * scaleFactor;
    let inputY = charY - (char1DisplayedHeight / 2) - 60; // 在角色頭頂上方
    let inputX = charX - char1Input.width / 2; // 水平置中
    char1Input.show();
    char1Input.position(inputX, inputY);
  } else {
    char1Input.hide();
    // 當角色1離開時，重置問題狀態
    if (dialogueState !== 'idle') {
      dialogueState = 'idle';
      currentQuestion = null;
      character2Dialogue = '';
      retryButton.hide();
      nextButton.hide();
    }
  }

  if (isOnGround2) {
    // 在地面上：根據角色1是否靠近以及自身是否移動來決定動畫
    if (isPlayer1Near) {
      // 如果角色1靠近，播放攻擊/動作動畫 (使用影格 3, 4, 5)
      let attackFrame = floor((frameCount / 8) % 3);
      currentFrame2 = 3 + attackFrame;

      // 根據您的要求，已移除傷害與擊退邏輯
    } else if (isMoving2) {
      // 走路動畫 (使用全部6個影格)
      currentFrame2 = floor((frameCount / 8) % allFrames2);
    } else {
      // 站立不動，在前3個影格之間循環
      currentFrame2 = floor((frameCount / 15) % 3);
    }
  } else {
    // 在空中：使用跳躍動畫
    // 從 all.png 中選擇第 4 個影格 (索引值為 3) 作為跳躍姿勢
    currentFrame2 = 3;
  }
  
  // 如果角色1離開攻擊範圍，重置被攻擊狀態
  if (!isPlayer1Near) {
    canBeHit = true;
  }

  let sx2 = currentFrame2 * frameWidth2;
  let frameImage2 = spriteSheet2.get(Math.round(sx2), 0, Math.round(frameWidth2), sHeight2);

  push();
  translate(char2X, char2Y);
  scale(direction2, 1);
  image(
    frameImage2,
    0,
    0,
    Math.round(frameWidth2) * scaleFactor2,
    sHeight2 * scaleFactor2
  );
  pop();

  // --- 角色 2 對話框邏輯 ---
  // 當角色1靠近時，顯示對話框
  if (isPlayer1Near && isOnGround2) {    
    // 如果處於閒置狀態且回饋時間已過，則提出新問題
    if (dialogueState === 'idle') {
      dialogueState = 'asking';
      let randomIndex = floor(random(questionBank.getRowCount()));
      currentQuestion = questionBank.getRow(randomIndex);
      character2Dialogue = currentQuestion.getString('題目');
    }

    // 如果有對話內容，則顯示對話框
    if (character2Dialogue) {
      let bubbleY = char2Y - (sHeight2 * scaleFactor2 / 2) - 60;
      displayDialogueBubble(char2X, bubbleY, character2Dialogue);

      // 根據對話狀態決定是否顯示按鈕
      if (dialogueState === 'feedback_wrong') {
        retryButton.position(char2X - retryButton.width / 2, bubbleY - 50);
        retryButton.show();
      } else if (dialogueState === 'feedback_correct') {
        nextButton.position(char2X - nextButton.width / 2, bubbleY - 50);
        nextButton.show();
      }
    }
  }
}

function displayDialogueBubble(x, y, speech) {
    push();
    // 設定文字樣式
    textSize(24);
    textAlign(CENTER, CENTER);
    let padding = 10; // 減少邊距讓對話框短一點
    let boxWidth = textWidth(speech) + padding * 2;
    let boxHeight = 40;

    // 繪製對話框背景
    fill(255); // 白色背景
    stroke(0); // 黑色邊框
    strokeWeight(2);
    rectMode(CENTER);
    rect(x, y, boxWidth, boxHeight, 10);

    // 繪製文字
    noStroke();
    fill(0); // 黑色文字
    text(speech, x, y);
    pop();
}

function keyPressed() {
  // 角色 1 的跳躍 (空白鍵)
  if (isOnGround && keyCode === 32) {
    velocityY = jumpForce; // 給予向上的初速度
    isOnGround = false; // 按下跳躍後立刻離開地面
    return false; // 防止瀏覽器預設行為 (例如：捲動頁面)
  }

  // 角色 2 的跳躍 ('W' 鍵，keyCode 為 87)
  if (isOnGround2 && keyCode === 87) {
    velocityY2 = jumpForce;
    isOnGround2 = false;
    return false;
  }

  // 當按下 Enter 鍵時提交答案
  if (keyCode === ENTER) {
    submitAnswer();
    return false; // 防止表單提交等預設行為
  }
}

function checkAnswer(userAnswer) {
  if (!currentQuestion) return;

  const correctAnswer = currentQuestion.getString('答案');
  if (userAnswer === correctAnswer) {
    // 答案正確，顯示 "完全正確" 並準備顯示 "下一題" 按鈕
    character2Dialogue = "完全正確！";
    dialogueState = 'feedback_correct';
  } else {
    // 答案錯誤，顯示提示內容並準備顯示 "再作答一次" 按鈕
    character2Dialogue = currentQuestion.getString('提示');
    dialogueState = 'feedback_wrong';
    // 答錯扣血
    char1HP -= 25;
    if (char1HP < 0) {
      char1HP = 0;
    }
  }
  char1Input.value(''); // 清空輸入框
  char1Speech = '';
}

function retryQuestion() {
  // 重新提問同一題
  dialogueState = 'asking';
  character2Dialogue = currentQuestion.getString('題目');
  retryButton.hide();
}

function nextQuestion() {
  // 準備問下一題
  dialogueState = 'idle';
  currentQuestion = null;
  character2Dialogue = '';
  nextButton.hide();
}

function drawHPBar() {
  push();
  let barWidth = 200;
  let barHeight = 25;
  let x = 20;
  let y = 20;

  // 繪製血條背景
  fill(100); // 灰色背景
  noStroke();
  rect(x, y, barWidth, barHeight, 5);

  // 根據目前血量計算血條長度
  let currentHPWidth = map(char1HP, 0, char1MaxHP, 0, barWidth);
  // 血量高於50%為綠色，低於50%為黃色，低於25%為紅色
  if (char1HP > char1MaxHP * 0.5) {
    fill('#4ade80'); // 綠色
  } else if (char1HP > char1MaxHP * 0.25) {
    fill('#facc15'); // 黃色
  } else {
    fill('#f87171'); // 紅色
  }
  rect(x, y, currentHPWidth, barHeight, 5);

  // 繪製邊框
  noFill();
  stroke(0);
  strokeWeight(2);
  rect(x, y, barWidth, barHeight, 5);
  pop();
}

function displayGameOver() {
  push();
  textSize(80);
  fill(255, 0, 0);
  stroke(0);
  strokeWeight(5);
  textAlign(CENTER, CENTER);
  text('遊戲結束', width / 2, height / 2);
  pop();
}
