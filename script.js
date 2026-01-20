const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const boardSize = 13;
let stones = [];
let redCircles = [];

let blackStonesCount = 45;
let whiteStonesCount = 45;
let currentPlayer = "white"; // игрок ходит первым
let botDifficulty = 50; // средний уровень сложности

let cellSize;

// --- Адаптивный canvas ---
function resizeCanvas() {
	const maxSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.9); // увеличиваем на 20%
	canvas.width = canvas.height = maxSize;
	cellSize = canvas.width / boardSize;
	drawBoard();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Рисуем доску ---
function drawBoard() {
	ctx.fillStyle = "#f5f5dc";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "#000";
	ctx.lineWidth = 1;

	for (let i = 0; i < boardSize; i++) {
		ctx.beginPath();
		ctx.moveTo(cellSize / 2, i * cellSize + cellSize / 2);
		ctx.lineTo(canvas.width - cellSize / 2, i * cellSize + cellSize / 2);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(i * cellSize + cellSize / 2, cellSize / 2);
		ctx.lineTo(i * cellSize + cellSize / 2, canvas.height - cellSize / 2);
		ctx.stroke();
	}
	drawStones();
}

// --- Рисуем фишки ---
function drawStones() {
	for (let s of stones) {
		ctx.beginPath();
		ctx.arc(s.x * cellSize + cellSize / 2, s.y * cellSize + cellSize / 2, cellSize / 4, 0, 2 * Math.PI); // Увеличиваем фишки
		ctx.fillStyle = s.color;
		ctx.fill();
	}
	for (let r of redCircles) {
		ctx.beginPath();
		ctx.arc(r.x * cellSize + cellSize / 2, r.y * cellSize + cellSize / 2, cellSize / 4, 0, 2 * Math.PI); // Увеличиваем подсветку
		ctx.fillStyle = "red";
		ctx.fill();
	}
}

// --- Соседи ---
function getNeighbors(x, y) {
	const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
	return dirs.map(d => ({ x: x + d.x, y: y + d.y })).filter(n => n.x >= 0 && n.x < boardSize && n.y >= 0 && n.y < boardSize);
}

// --- Дыхание ---
function hasLiberty(x, y, color, visited = new Set()) {
	const key = `${x},${y}`;
	if (visited.has(key)) return false;
	visited.add(key);

	const neighbors = getNeighbors(x, y);
	for (let n of neighbors) {
		const s = stones.find(st => st.x === n.x && st.y === n.y);
		if (!s) return true;
		if (s.color === color && hasLiberty(n.x, n.y, color, visited)) return true;
	}
	return false;
}

// --- Удаление захваченных фишек ---
function removeCaptured() {
	const captured = stones.filter(s => !hasLiberty(s.x, s.y, s.color));
	if (captured.length > 0) {
		stones = stones.filter(st => !captured.includes(st));
		for (let c of captured) {
			if (c.color === "black") blackStonesCount++;
			else whiteStonesCount++;
		}
		updateStoneCount();
	}
	updateWinProbability();
}

// --- Суицид ---
function isSuicide(x, y, color) {
	stones.push({ x, y, color });
	const ok = hasLiberty(x, y, color);
	stones.pop();
	return !ok;
}

// --- Красная подсветка ---
function showRed(x, y) {
	redCircles.push({ x, y });
	drawBoard();
	setTimeout(() => { redCircles = []; drawBoard(); }, 500);
}

// --- Обновление счетчика и полосок ---
function updateStoneCount() {
	document.getElementById("black-count").textContent = blackStonesCount;
	document.getElementById("white-count").textContent = whiteStonesCount;
	document.getElementById("turn").textContent = currentPlayer === "black" ? "Бот" : "Вы";
	updateWinProbability();
}

function updateWinProbability() {
	let blackScore = blackStonesCount;
	let whiteScore = whiteStonesCount;

	const total = blackScore + whiteScore || 1;
	const blackPercent = Math.round((blackScore / total) * 100);
	const whitePercent = 100 - blackPercent;

	document.getElementById("black-bar").style.width = blackPercent + "%";
	document.getElementById("white-bar").style.width = whitePercent + "%";
	document.getElementById("black-percent").textContent = blackPercent + "%";
	document.getElementById("white-percent").textContent = whitePercent + "%";
}

// --- Уровень сложности ---
function setDifficulty(percent) {
	// Снимаем класс selected со всех кнопок
	const buttons = document.querySelectorAll("button");
	buttons.forEach(btn => btn.classList.remove("selected"));

	// Находим кнопку, соответствующую выбранному уровню сложности
	const selectedButton = Array.from(buttons).find(button => button.textContent === getDifficultyText(percent));

	// Добавляем класс selected для выбранной кнопки
	selectedButton.classList.add("selected");

	// Сохраняем текущий уровень сложности
	botDifficulty = percent;
}

// Получаем текст, соответствующий сложности
function getDifficultyText(percent) {
	switch (percent) {
		case 25: return "Новичок";
		case 50: return "Средний";
		case 75: return "Мастер";
		case 100: return "ГОГО";
		default: return "";
	}
}

// --- Логика хода бота ---
function botMove() {
	// В зависимости от сложности бот выбирает клетки
	const availableMoves = [];
	for (let x = 0; x < boardSize; x++) {
		for (let y = 0; y < boardSize; y++) {
			if (!stones.find(st => st.x === x && st.y === y)) { // если клетка свободна
				availableMoves.push({ x, y });
			}
		}
	}

	// Логика для бота: случайный ход с учетом сложности
	const moveIndex = Math.floor(Math.random() * availableMoves.length);
	const move = availableMoves[moveIndex];

	// Добавляем фишку бота
	stones.push({ x: move.x, y: move.y, color: "black" });
	currentPlayer = "white"; // переключаем на игрока

	drawBoard();
	removeCaptured();
	updateStoneCount();
}

// --- Обработчик нажатия ---
canvas.addEventListener("click", (event) => {
	if (currentPlayer !== "white") return; // Игрок только ходит первым

	const rect = canvas.getBoundingClientRect();
	const x = Math.floor((event.clientX - rect.left) / cellSize);
	const y = Math.floor((event.clientY - rect.top) / cellSize);

	// Проверяем, не занято ли место
	const existingStone = stones.find(stone => stone.x === x && stone.y === y);
	if (existingStone) return;

	// Размещение фишки игрока
	stones.push({ x, y, color: currentPlayer });
	currentPlayer = "black"; // ход бота

	// Отображаем доску
	drawBoard();
	removeCaptured();
	updateStoneCount();

	// После хода игрока делает ход бот
	setTimeout(botMove, 1000); // Бот делает ход через 1 секунду
});
