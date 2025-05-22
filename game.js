document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const blockSize = 20;
  const width = canvas.width;
  const height = canvas.height;
  const widthInBlocks = width / blockSize;
  const heightInBlocks = height / blockSize;

  const loginForm = document.getElementById("loginForm");
  const loginContainer = document.getElementById("loginContainer");
  const gameContainer = document.getElementById("gameContainer");

  const startButton = document.getElementById("startButton");
  const pauseButton = document.getElementById("pauseButton");
  const restartButton = document.getElementById("restartButton");
  const helpButton = document.getElementById("helpButton");
  const highScoresButton = document.getElementById("highScoresButton");
  const saveButton = document.getElementById("saveButton");
  const difficultySelect = document.getElementById("difficulty");
  const highScoresContainer = document.getElementById("highScoresContainer");
  const highScoresBody = document.getElementById("highScoresBody");

  let currentUser = null;
  let intervalId;
  let isPaused = false;
  let score = 0;

  const speed = { easy: 200, medium: 100, hard: 50 };

  function Block(col, row) {
    this.col = col;
    this.row = row;
  }

  Block.prototype.drawSquare = function (color) {
    const x = this.col * blockSize;
    const y = this.row * blockSize;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, blockSize, blockSize);
  };

  Block.prototype.drawCircle = function (color) {
    const centerX = this.col * blockSize + blockSize / 2;
    const centerY = this.row * blockSize + blockSize / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, blockSize / 2, 0, Math.PI * 2, false);
    ctx.fill();
  };

  Block.prototype.equal = function (other) {
    return this.col === other.col && this.row === other.row;
  };

  function Snake() {
    this.segments = [new Block(7, 5), new Block(6, 5), new Block(5, 5)];
    this.direction = "right";
    this.nextDirection = "right";
  }

  Snake.prototype.draw = function () {
    this.segments.forEach(segment => segment.drawSquare("#1565c0"));
  };

  Snake.prototype.move = function () {
    const head = this.segments[0];
    let newHead;
    this.direction = this.nextDirection;

    switch (this.direction) {
      case "right": newHead = new Block(head.col + 1, head.row); break;
      case "left": newHead = new Block(head.col - 1, head.row); break;
      case "up": newHead = new Block(head.col, head.row - 1); break;
      case "down": newHead = new Block(head.col, head.row + 1); break;
    }

    if (this.checkCollision(newHead)) return gameOver();
    this.segments.unshift(newHead);

    if (newHead.equal(apple.position)) {
      score++;
      apple.move();
    } else {
      this.segments.pop();
    }
  };

  Snake.prototype.checkCollision = function (head) {
    const wallCollision = head.col === 0 || head.row === 0 ||
      head.col === widthInBlocks - 1 || head.row === heightInBlocks - 1;
    const selfCollision = this.segments.some(segment => head.equal(segment));
    return wallCollision || selfCollision;
  };

  Snake.prototype.setDirection = function (newDir) {
    const opposites = { up: "down", down: "up", left: "right", right: "left" };
    if (opposites[this.direction] !== newDir) this.nextDirection = newDir;
  };

  function Apple() {
    this.position = new Block(10, 10);
  }

  Apple.prototype.draw = function () {
    this.position.drawCircle("red");
  };

  Apple.prototype.move = function () {
    const randomCol = Math.floor(Math.random() * (widthInBlocks - 2)) + 1;
    const randomRow = Math.floor(Math.random() * (heightInBlocks - 2)) + 1;
    this.position = new Block(randomCol, randomRow);
  };

  let snake = new Snake();
  let apple = new Apple();

  const directions = { 37: "left", 38: "up", 39: "right", 40: "down" };

  document.addEventListener("keydown", e => {
    if ([37, 38, 39, 40].includes(e.keyCode)) e.preventDefault();
    const newDirection = directions[e.keyCode];
    if (newDirection) snake.setDirection(newDirection);
  }, { passive: false });

  function drawBorder() {
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, width, blockSize);
    ctx.fillRect(0, height - blockSize, width, blockSize);
    ctx.fillRect(0, 0, blockSize, height);
    ctx.fillRect(width - blockSize, 0, blockSize, height);
  }

  function drawScore() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(`Score: ${score}`, blockSize, blockSize);
  }

  function gameOver() {
    clearInterval(intervalId);
    ctx.font = "50px Arial";
    ctx.fillStyle = "red";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", width / 2, height / 2);
    if (currentUser) saveScore(currentUser.username, score, difficultySelect.value);
    setTimeout(displayHighScores, 1000);
  }

  function gameLoop() {
    ctx.clearRect(0, 0, width, height);
    drawScore();
    snake.move();
    snake.draw();
    apple.draw();
    drawBorder();
  }

function displayHighScores() {
  const db = firebase.database();
  const scoresRef = db.ref("scores");
  scoresRef.once("value", snapshot => {
    const allScores = [];
    snapshot.forEach(child => {
      allScores.push(child.val());
    });

    const diffRank = { hard: 0, medium: 1, easy: 2 };
    allScores.sort((a, b) => {
      if (diffRank[a.difficulty] !== diffRank[b.difficulty]) {
        return diffRank[a.difficulty] - diffRank[b.difficulty];
      }
      return b.score - a.score;
    });

    const top10 = allScores.slice(0, 10);
    highScoresBody.innerHTML = "";
    top10.forEach((s, i) => {
      const row = highScoresBody.insertRow();
      row.innerHTML = `<td>${i + 1}</td><td>${s.username}</td><td>${s.score}</td><td>${s.difficulty}</td>`;
    });
    highScoresContainer.classList.remove("hidden");
  });
}


  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    currentUser = { username, password }; // локальна авторизація без зберігання
    loginContainer.classList.add("hidden");
    gameContainer.classList.remove("hidden");
  });

  startButton.addEventListener("click", () => {
    clearInterval(intervalId);
    intervalId = setInterval(gameLoop, speed[difficultySelect.value]);
    startButton.classList.add("hidden");
    pauseButton.classList.remove("hidden");
    restartButton.classList.remove("hidden");
    highScoresContainer.classList.add("hidden");
  });

  pauseButton.addEventListener("click", () => {
    if (isPaused) {
      intervalId = setInterval(gameLoop, speed[difficultySelect.value]);
      pauseButton.textContent = "Pause";
    } else {
      clearInterval(intervalId);
      pauseButton.textContent = "Resume";
    }
    isPaused = !isPaused;
  });

  restartButton.addEventListener("click", () => {
    clearInterval(intervalId);
    snake = new Snake();
    apple = new Apple();
    score = 0;
    startButton.classList.remove("hidden");
    pauseButton.classList.add("hidden");
    restartButton.classList.add("hidden");
    ctx.clearRect(0, 0, width, height);
  });

  helpButton.addEventListener("click", () => {
    alert("Use arrow keys to move. Eat apples to grow. Avoid walls and yourself!");
  });

  highScoresButton.addEventListener("click", () => {
    if (highScoresContainer.classList.contains("hidden")) {
      displayHighScores();
    } else {
      highScoresContainer.classList.add("hidden");
    }
  });

  saveButton.addEventListener("click", () => {
    alert("Scores are saved online via Firebase. No need to download manually.");
  });
});
