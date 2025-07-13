class Game {

	static ENEMY_COUNT = 10;
	static SWORD_COUNT = 2;
	static SWORD_BONUS_DAMAGE = 20;
	static HEALTH_POTION_COUNT = 10;
	static HEALTH_POTION_HEAL = 15;

	constructor() {
		this.width = 40;
		this.height = 24;
		this.tileSize = 25;
		this.map = [];
		this.player = null;
		this.enemies = [];
		this.items = [];
		this.keyLock = false;
		this.initialized = false;
		this.defaultPlayerStats = {
			health: 100,
			maxHealth: 100,
			damage: 20
		}
		this.defaultEnemyStats = {
			health: 60,
			maxHealth: 60,
			damage: 15
		}
		this.TILE_TYPES = {
			WALL: 'W',
			EMPTY: '',
			PLAYER: 'P',
			ENEMY: 'E',
			HEALTH_POTION: 'HP',
			SWORD: 'SW'
		};
	}

	init() {
		this.initMap();
		this.generateRoomsAndConnect();
		this.placeItems();
		this.placePlayer();
		this.placeEnemies();
		this.render();
		if (!this.initialized) {
			this.bindEvents();
			this.initialized = true;
		}
	}

	initMap() {
		this.map = [];
		for (let y = 0; y < this.height; y++) {
			this.map[y] = [];
			for (let x = 0; x < this.width; x++) {
				this.map[y][x] = this.TILE_TYPES.WALL;
			}
		}
	}

	// Генерация комнат и коридоров
	generateRoomsAndConnect() {
		const numRooms = Math.floor(Math.random() * 6) + 5;
		this.roomCenters = [];
		for (let i = 0; i < numRooms; i++) {
			const width = Math.floor(Math.random() * 6) + 3;
			const height = Math.floor(Math.random() * 6) + 3;
			const x = Math.floor(Math.random() * (this.width - width - 2)) + 1;
			const y = Math.floor(Math.random() * (this.height - height - 2)) + 1;

			let overlaps = false;
			for (let room of this.roomCenters) {
				if (
					x < room.x2 + 2 && x + width > room.x1 - 2 &&
					y < room.y2 + 2 && y + height > room.y1 - 2
				) {
					overlaps = true;
					break;
				}
			}
			if (overlaps) {
				i--;
				continue;
			}

			for (let roomY = y; roomY < y + height; roomY++) {
				for (let roomX = x; roomX < x + width; roomX++) {
					this.map[roomY][roomX] = this.TILE_TYPES.EMPTY;
				}
			}
			this.roomCenters.push({
				x: Math.floor(x + width / 2),
				y: Math.floor(y + height / 2),
				x1: x,
				y1: y,
				x2: x + width - 1,
				y2: y + height - 1
			});
		}
		for (let i = 1; i < this.roomCenters.length; i++) {
			let prev = this.roomCenters[i - 1];
			let curr = this.roomCenters[i];
			this.createCorridor(prev.x, prev.y, curr.x, curr.y);
		}
	}

	// Коридор между двумя точками
	createCorridor(x1, y1, x2, y2) {
		let x = x1, y = y1;
		while (x !== x2) {
			this.map[y][x] = this.TILE_TYPES.EMPTY;
			x += (x2 > x) ? 1 : -1;
		}
		while (y !== y2) {
			this.map[y][x] = this.TILE_TYPES.EMPTY;
			y += (y2 > y) ? 1 : -1;
		}
		this.map[y][x] = this.TILE_TYPES.EMPTY;
	}

	// Размещение предметов
	placeItems() {
		this.items = [];
		for (let i = 0; i < Game.SWORD_COUNT; i++) {
			const pos = this.getRandomEmptyPosition();
			if (pos) this.items.push({ x: pos.x, y: pos.y, type: this.TILE_TYPES.SWORD });
		}
		for (let i = 0; i < Game.HEALTH_POTION_COUNT; i++) {
			const pos = this.getRandomEmptyPosition();
			if (pos) this.items.push({ x: pos.x, y: pos.y, type: this.TILE_TYPES.HEALTH_POTION });
		}
	}

    // Размещение игрока
	placePlayer() {
		const pos = this.getRandomEmptyPosition();
		if (pos) {
			this.player = { x: pos.x, y: pos.y };
			this.playerStats = { ...this.defaultPlayerStats };
		}
	}

	// Размещение врагов
	placeEnemies() {
		this.enemies = [];
		for (let i = 0; i < Game.ENEMY_COUNT; i++) {
			const pos = this.getRandomEmptyPosition();
			if (pos) {
				this.enemies.push({
					x: pos.x,
					y: pos.y,
					...this.defaultEnemyStats
				});
			}
		}
	}

	// Получить случайную свободную позицию
	getRandomEmptyPosition() {
		const emptyPositions = [];
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				if (this.map[y][x] === this.TILE_TYPES.EMPTY && !this.isPositionOccupied(x, y)) {
					emptyPositions.push({ x, y });
				}
			}
		}
		if (emptyPositions.length === 0) return null;
		return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
	}

	// Проверка занятости позиции
	isPositionOccupied(x, y) {
		if (this.player && this.player.x === x && this.player.y === y) return true;
		for (let enemy of this.enemies) if (enemy.x === x && enemy.y === y) return true;
		for (let item of this.items) if (item.x === x && item.y === y) return true;
		return false;
	}

	// Обработка управления
	bindEvents() {
		$(document).off('keydown.game');
		$(document).off('keyup.game');
		$(document).on('keydown.game', (e) => {
			if (this.keyLock) return;
			this.keyLock = true;

			let actionTaken = false;
			switch (e.key.toLowerCase()) {
				case 'w': e.preventDefault(); actionTaken = this.movePlayer(0, -1); break;
				case 's': e.preventDefault(); actionTaken = this.movePlayer(0, 1); break;
				case 'a': e.preventDefault(); actionTaken = this.movePlayer(-1, 0); break;
				case 'd': e.preventDefault(); actionTaken = this.movePlayer(1, 0); break;
				case ' ': e.preventDefault(); actionTaken = this.playerAttack(); break;
			}

			if (actionTaken) {
				this.enemyTurn();
				this.render();
			}
		});
		$(document).on('keyup.game', () => {
			this.keyLock = false;
		});
	}
	
	// Проверка, можно ли двигаться на (x, y)
	canMoveTo(x, y, { ignorePlayer = false, ignoreEnemies = false, self = null } = {}) {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
		if (this.map[y][x] === this.TILE_TYPES.WALL) return false;

		if (!ignorePlayer && this.player.x === x && this.player.y === y) return false;

		if (!ignoreEnemies) {
			for (let enemy of this.enemies) {
				if (self && enemy === self) continue;
				if (enemy.x === x && enemy.y === y) return false;
			}
		}
		return true;
	}

	// Движение игрока
	movePlayer(dx, dy) {
		if (!this.player) return false;
		const newX = this.player.x + dx;
		const newY = this.player.y + dy;
		if (!this.canMoveTo(newX, newY, { ignorePlayer: true })) return false;
		this.player.x = newX;
		this.player.y = newY;
		this.checkItemPickup();
		return true;
	}

	// Проверка подбора предметов
	checkItemPickup() {
		for (let i = this.items.length - 1; i >= 0; i--) {
			const item = this.items[i];
			if (item.x === this.player.x && item.y === this.player.y) {
				if (item.type === this.TILE_TYPES.HEALTH_POTION) {
					this.playerStats.health = Math.min(
						this.playerStats.health + Game.HEALTH_POTION_HEAL,
						this.playerStats.maxHealth
					);
				} else if (item.type === this.TILE_TYPES.SWORD) {
					this.playerStats.damage += Game.SWORD_BONUS_DAMAGE;
				}
				this.items.splice(i, 1);
			}
		}
	}

	// Атака всех соседних врагов
	playerAttack() {
		const adjacentEnemies = this.getAdjacentEnemies(this.player.x, this.player.y);
		if (adjacentEnemies.length === 0) return false;
		for (let enemy of adjacentEnemies) {
			enemy.health -= this.playerStats.damage;
			if (enemy.health <= 0) this.removeEnemy(enemy);
		}
		return true;
	}

	// Получить всех врагов по соседству
	getAdjacentEnemies(x, y) {
		const adjacent = [];
		const directions = [
			[-1, -1], [0, -1], [1, -1],
			[-1, 0], [1, 0],
			[-1, 1], [0, 1], [1, 1]
		];
		for (let [dx, dy] of directions) {
			const checkX = x + dx;
			const checkY = y + dy;
			for (let enemy of this.enemies) {
				if (enemy.x === checkX && enemy.y === checkY) {
					adjacent.push(enemy);
				}
			}
		}
		return adjacent;
	}

	// Удалить врага
	removeEnemy(enemyToRemove) {
		this.enemies = this.enemies.filter(enemy => enemy !== enemyToRemove);
	}

	// Ход врагов
	enemyTurn() {
		for (let enemy of this.enemies) {
			if (this.isAdjacent(enemy.x, enemy.y, this.player.x, this.player.y)) {
				this.playerStats.health -= enemy.damage;
				if (this.playerStats.health <= 0) {
					this.gameOver();
					return;
				}
			} else {
				this.moveEnemyRandomly(enemy);
			}
		}
	}

	// Являются ли клетки соседними
	isAdjacent(x1, y1, x2, y2) {
		return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1;
	}

	// Случайное передвижение врага
	moveEnemyRandomly(enemy) {
		const directions = [
			[-1, 0], [1, 0], [0, -1], [0, 1]
		];
		const direction = directions[Math.floor(Math.random() * directions.length)];
		const newX = enemy.x + direction[0];
		const newY = enemy.y + direction[1];
		if (this.canMoveTo(newX, newY, { self: enemy })) {
			enemy.x = newX;
			enemy.y = newY;
		}
	}

	// Показать модальное окно
	showModal(title, text) {
		$('#modal-title').text(title);
		$('#modal-text').text(text);
		$('#game-modal').fadeIn(200);
	}

	// Скрыть модалку
	hideModal() {
		$('#game-modal').fadeOut(150);
	}

	// Проигрыш
	gameOver() {
		this.showModal('Игра окончена!', 'Вы погибли 😵');
	}

	// Победа
	winGame() {
		this.showModal('Победа!', 'Поздравляем! Вы победили всех врагов! 🎉');
	}

	// Отрисовывает полоску здоровья
	createHealthBar(current, max) {
		const bar = $('<div class="health"></div>');
		bar.css('width', Math.max(0, (current / max * 100)) + '%');
		return bar;
	}

	// Отрисовка карты
	render() {
		const field = $('.field');
		field.empty();
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const tile = $('<div class="tile"></div>');
				tile.css({
					left: x * this.tileSize,
					top: y * this.tileSize
				});
				if (this.map[y][x] === this.TILE_TYPES.WALL) {
					tile.addClass('tileW');
				} else {
					let hasSpecialTile = false;
					if (this.player && this.player.x === x && this.player.y === y) {
						tile.addClass('tileP');
						tile.append(this.createHealthBar(this.playerStats.health, this.playerStats.maxHealth))
						hasSpecialTile = true;
					}
					if (!hasSpecialTile) {
						for (let enemy of this.enemies) {
							if (enemy.x === x && enemy.y === y) {
								tile.addClass('tileE');
								tile.append(this.createHealthBar(enemy.health, enemy.maxHealth));
								hasSpecialTile = true;
								break;
							}
						}
					}
					if (!hasSpecialTile) {
						for (let item of this.items) {
							if (item.x === x && item.y === y) {
								if (item.type === this.TILE_TYPES.HEALTH_POTION) tile.addClass('tileHP');
								else if (item.type === this.TILE_TYPES.SWORD) tile.addClass('tileSW');
								hasSpecialTile = true;
								break;
							}
						}
					}
				}
				field.append(tile);
			}
		}
		if (this.enemies.length === 0) {
			setTimeout(() => {
				this.winGame();
			}, 100);
		}
	}
}

// Инициализация игры и обновление информации
$(document).ready(function () {
    window.game = new Game();
    game.init();

    setInterval(function () {
        $('#health').text(game.playerStats.health);
        $('#damage').text(game.playerStats.damage);
        $('#enemies').text(game.enemies.length);
    }, 100);

    $('#restart-btn').on('click', function () {
        $('#game-modal').fadeOut(150);
        window.game.init();
    });
});
