const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const boardSize = 13;
let stones = [];
let redCircles = [];

let blackStonesCount = 45;
let whiteStonesCount = 45;
let currentPlayer = "white"; // игрок ходит первым
let botDifficulty = 50; // средний уровень

let cellSize;

// --- Адаптивный canvas ---
function resizeCanvas() {
	const maxSize = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.8);
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
		ctx.arc(s.x * cellSize + cellSize / 2, s.y * cellSize + cellSize / 2, cellSize / 3, 0, 2 * Math.PI);
		ctx.fillStyle = s.color;
		ctx.fill();
	}
	for (let r of redCircles) {
		ctx.beginPath();
		ctx.arc(r.x * cellSize + cellSize / 2, r.y * cellSize + cellSize / 2, cellSize / 3, 0, 2 * Math.PI);
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
	botDifficulty = percent;
}

// --- Обработка клика/тача ---
function handleInput(e) {
	e.preventDefault();
	if (currentPlayer !== "white") return;

	const rect = canvas.getBoundingClientRect();
	let clientX = e.clientX || e.touches[0].clientX;
	let clientY = e.clientY || e.touches[0].clientY;

	const x = Math.floor((clientX - rect.left) / cellSize);
	const y = Math.floor((clientY - rect.top) / cellSize);

	if (stones.find(s => s.x === x && s.y === y)) return;

	if (isSuicide(x, y, "white")) {
		showRed(x, y);
		return;
	}

	stones.push({ x, y, color: "white" });
	whiteStonesCount--;
	removeCaptured();
	currentPlayer = "black";
	updateStoneCount();
	drawBoard();

	setTimeout(botMove, 2000 + Math.random() * 2000);
}

canvas.addEventListener('click', handleInput);
canvas.addEventListener('touchstart', handleInput);

// --- Ход бота ---
function botMove() {
	if (currentPlayer !== "black") return;

	let freeCells = [];
	for (let x = 0; x < boardSize; x++) {
		for (let y = 0; y < boardSize; y++) {
			if (!stones.find(s => s.x === x && s.y === y)) freeCells.push({ x, y });
		}
	}
	if (freeCells.length === 0) { currentPlayer = "white"; updateStoneCount(); return; }

	let preferred = freeCells.filter(c => {
		const neighbors = getNeighbors(c.x, c.y);
		return neighbors.some(n => stones.find(s => s.x === n.x && s.y === n.y && s.color === "black"));
	});
	if (preferred.length === 0) preferred = freeCells;

	let move = preferred[Math.floor(Math.random() * preferred.length)];

	if (isSuicide(move.x, move.y, "black")) {
		let okCells = freeCells.filter(c => !isSuicide(c.x, c.y, "black"));
		if (okCells.length > 0) move = okCells[Math.floor(Math.random() * okCells.length)];
		else { currentPlayer = "white"; updateStoneCount(); return; }
	}

	stones.push({ x: move.x, y: move.y, color: "black" });
	blackStonesCount--;
	removeCaptured();
	currentPlayer = "white";
	updateStoneCount();
	drawBoard();
}
