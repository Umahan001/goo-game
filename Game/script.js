const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const boardSize = 13;
let stones = [];
let redCircles = [];

let blackStonesCount = 45;
let whiteStonesCount = 45;

let currentPlayer = "white"; // первый ход за игроком
let botDifficulty = 50; // средний уровень

// адаптивный размер доски
let canvasSize = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7);
canvas.width = canvas.height = canvasSize;
let cellSize = canvasSize / boardSize;

window.addEventListener("resize", () => {
	canvasSize = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7);
	canvas.width = canvas.height = canvasSize;
	cellSize = canvasSize / boardSize;
	drawBoard();
});

updateStoneCount();
drawBoard();

// --- Рисуем доску ---
function drawBoard() {
	ctx.fillStyle = "#f5f5dc"; // цвет березы
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "#000"; // линии черные
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
	let dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
	return dirs.map(d => ({ x: x + d.x, y: y + d.y })).filter(n => n.x >= 0 && n.x < boardSize && n.y >= 0 && n.y < boardSize);
}

// --- Дыхание ---
function hasLiberty(x, y, color, visited = new Set()) {
	let key = `${x},${y}`;
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
	let captured = [];
	for (let s of stones) {
		if (!hasLiberty(s.x, s.y, s.color)) captured.push(s);
	}
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

// --- Обновление счетчика ---
function updateStoneCount() {
	document.getElementById("black-count").textContent = blackStonesCount;
	document.getElementById("white-count").textContent = whiteStonesCount;
	document.getElementById("turn").textContent = currentPlayer === "black" ? "Бот" : "Вы";
	updateWinProbability();
}

// --- Клик / касание ---
function handleInput(e) {
	e.preventDefault();
	if (currentPlayer !== "white") return;

	const rect = canvas.getBoundingClientRect();
	let clientX = e.clientX || e.touches[0].clientX;
	let clientY = e.clientY || e.touches[0].clientY;

	// Корректировка координат с учётом размеров доски
	const x = Math.floor((clientX - rect.left) / cellSize);
	const y = Math.floor((clientY - rect.top) / cellSize);

	// Проверка, есть ли уже фишка в этой клетке
	if (stones.find(s => s.x === x && s.y === y)) return;

	// Проверка на суицид
	if (isSuicide(x, y, "white")) {
		showRed(x, y);
		return;
	}

	// Добавление фишки на доску
	stones.push({ x, y, color: "white" });
	whiteStonesCount--;

	// Удаление захваченных фишек
	removeCaptured();

	// Смена хода на чёрного
	currentPlayer = "black";

	updateStoneCount();
	drawBoard();

	// Бот делает ход через 2-4 секунды
	setTimeout(botMove, 2000 + Math.random() * 2000);
}
canvas.addEventListener("click", handleInput);
canvas.addEventListener("touchstart", handleInput);

// --- Бот ---
function botMove() {
	if (currentPlayer !== "black") return;

	let freeCells = [];
	for (let x = 0; x < boardSize; x++) {
		for (let y = 0; y < boardSize; y++) {
			if (!stones.find(s => s.x === x && s.y === y)) freeCells.push({ x, y });
		}
	}
	if (freeCells.length === 0) {
		currentPlayer = "white";
		updateStoneCount();
		return;
	}

	let preferred = [];
	if (botDifficulty <= 25) {
		preferred = freeCells;
	} else if (botDifficulty <= 50) {
		for (let cell of freeCells) {
			if (getNeighbors(cell.x, cell.y).some(n => stones.find(s => s.x === n.x && s.y === n.y && s.color === "black")))
				preferred.push(cell);
		}
	} else if (botDifficulty <= 75) {
		for (let cell of freeCells) {
			if (getNeighbors(cell.x, cell.y).some(n => stones.find(s => s.x === n.x && s.y === n.y)))
				preferred.push(cell);
		}
	} else {
		preferred = freeCells;
	}

	let move = preferred.length > 0 ? preferred[Math.floor(Math.random() * preferred.length)]
		: freeCells[Math.floor(Math.random() * freeCells.length)];

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

// --- Реальная вероятность победы ---
function updateWinProbability() {
	let blackScore = blackStonesCount;
	let whiteScore = whiteStonesCount;

	for (let x = 0; x < boardSize; x++) {
		for (let y = 0; y < boardSize; y++) {
			let s = stones.find(st => st.x === x && st.y === y);
			if (!s) {
				let neighbors = getNeighbors(x, y);
				let neighborColors = neighbors.map(n => {
					let st = stones.find(st => st.x === n.x && st.y === n.y);
					return st ? st.color : null;
				}).filter(c => c);

				if (neighborColors.length > 0) {
					let allBlack = neighborColors.every(c => c === "black");
					let allWhite = neighborColors.every(c => c === "white");

					if (allBlack) blackScore++;
					else if (allWhite) whiteScore++;
				}
			}
		}
	}

	let total = blackScore + whiteScore;
	if (total === 0) total = 1;
	let blackPercent = Math.round((blackScore / total) * 100);
	let whitePercent = 100 - blackPercent;

	document.getElementById("black-bar").style.width = blackPercent + "%";
	document.getElementById("white-bar").style.width = whitePercent + "%";
	document.getElementById("black-percent").textContent = blackPercent + "%";
	document.getElementById("white-percent").textContent = whitePercent + "%";
}
