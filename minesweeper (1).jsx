import { useState, useEffect, useCallback } from "react";

const DIFFICULTIES = {
  EASY: { rows: 9, cols: 9, mines: 10, label: "Rookie" },
  MEDIUM: { rows: 16, cols: 16, mines: 40, label: "Detective" },
  HARD: { rows: 16, cols: 30, mines: 99, label: "Genius" },
};

const CELL_COLORS = ["", "#3b82f6", "#16a34a", "#dc2626", "#7c3aed", "#b45309", "#0891b2", "#374151", "#6b7280"];

function createBoard(rows, cols, mines, firstRow, firstCol) {
  const board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r, col: c, mine: false, revealed: false, flagged: false, count: 0,
    }))
  );
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!board[r][c].mine && !(Math.abs(r - firstRow) <= 1 && Math.abs(c - firstCol) <= 1)) {
      board[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].mine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
          }
        board[r][c].count = count;
      }
    }
  }
  return board;
}

function revealCells(board, row, col, rows, cols) {
  const newBoard = board.map(r => r.map(c => ({ ...c })));
  const stack = [[row, col]];
  while (stack.length) {
    const [r, c] = stack.pop();
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    const cell = newBoard[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.count === 0 && !cell.mine) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr !== 0 || dc !== 0) stack.push([r + dr, c + dc]);
    }
  }
  return newBoard;
}

function checkWin(board) {
  return board.every(row => row.every(cell => cell.revealed || cell.mine));
}

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState("EASY");
  const [board, setBoard] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost
  const [minesLeft, setMinesLeft] = useState(DIFFICULTIES.EASY.mines);
  const [time, setTime] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const [explodedCell, setExplodedCell] = useState(null);
  const [flagMode, setFlagMode] = useState(false);

  const cfg = DIFFICULTIES[difficulty];

  useEffect(() => {
    let interval;
    if (gameState === "playing") {
      interval = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const startGame = useCallback((diff = difficulty) => {
    const d = DIFFICULTIES[diff];
    setBoard(null);
    setGameState("idle");
    setMinesLeft(d.mines);
    setTime(0);
    setFirstClick(true);
    setExplodedCell(null);
    setFlagMode(false);
    setDifficulty(diff);
  }, [difficulty]);

  const handleClick = useCallback((row, col) => {
    if (gameState === "won" || gameState === "lost") return;

    if (flagMode) {
      handleRightClick({ preventDefault: () => {} }, row, col);
      return;
    }

    setGameState("playing");

    let currentBoard = board;
    if (firstClick || !currentBoard) {
      currentBoard = createBoard(cfg.rows, cfg.cols, cfg.mines, row, col);
      setFirstClick(false);
    }

    const cell = currentBoard[row][col];
    if (cell.revealed || cell.flagged) return;

    if (cell.mine) {
      const newBoard = currentBoard.map(r => r.map(c => ({ ...c, revealed: c.mine ? true : c.revealed })));
      setBoard(newBoard);
      setGameState("lost");
      setExplodedCell({ row, col });
      return;
    }

    const newBoard = revealCells(currentBoard, row, col, cfg.rows, cfg.cols);
    setBoard(newBoard);
    if (checkWin(newBoard)) setGameState("won");
  }, [board, firstClick, gameState, cfg, flagMode, handleRightClick]);

  const handleRightClick = useCallback((e, row, col) => {
    e.preventDefault();
    if (!board || gameState === "won" || gameState === "lost") return;
    const cell = board[row][col];
    if (cell.revealed) return;
    const newBoard = board.map(r => r.map(c => ({ ...c })));
    newBoard[row][col].flagged = !newBoard[row][col].flagged;
    setBoard(newBoard);
    setMinesLeft(m => newBoard[row][col].flagged ? m - 1 : m + 1);
  }, [board, gameState]);

  const renderCell = (cell) => {
    const isExploded = explodedCell && cell.row === explodedCell.row && cell.col === explodedCell.col;
    let content = "";
    let style = {};

    if (cell.flagged && !cell.revealed) {
      content = "🚩";
    } else if (!cell.revealed) {
      content = "";
    } else if (cell.mine) {
      content = isExploded ? "💥" : "💣";
    } else if (cell.count > 0) {
      content = cell.count;
      style.color = CELL_COLORS[cell.count];
    }

    const classes = [
      "cell",
      cell.revealed ? "revealed" : "hidden",
      isExploded ? "exploded" : "",
      gameState === "lost" && cell.mine && !cell.flagged && !isExploded ? "dead-mine" : "",
    ].filter(Boolean).join(" ");

    return (
      <button
        key={`${cell.row}-${cell.col}`}
        className={classes}
        onClick={() => handleClick(cell.row, cell.col)}
        onContextMenu={(e) => handleRightClick(e, cell.row, cell.col)}
        style={style}
      >
        {content}
      </button>
    );
  };

  const faceEmoji = gameState === "won" ? "😎" : gameState === "lost" ? "😵" : "🙂";

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@500;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .app {
          min-height: 100vh;
          background: #0a0a0a;
          background-image:
            radial-gradient(ellipse at 20% 50%, rgba(20,80,40,0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(0,60,120,0.12) 0%, transparent 60%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Share Tech Mono', monospace;
        }

        .title {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 2.4rem;
          letter-spacing: 0.18em;
          color: #e8e8e8;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .subtitle {
          font-size: 0.7rem;
          letter-spacing: 0.25em;
          color: #4ade80;
          margin-bottom: 24px;
          text-transform: uppercase;
        }

        .description {
          max-width: 480px;
          text-align: center;
          color: #555;
          font-size: 0.72rem;
          line-height: 1.7;
          letter-spacing: 0.04em;
          margin-bottom: 20px;
          padding: 0 8px;
        }
          background: #111;
          border: 1px solid #222;
          border-radius: 4px;
          box-shadow: 0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04);
          overflow: hidden;
        }

        .diff-bar {
          display: flex;
          border-bottom: 1px solid #1e1e1e;
        }

        .diff-btn {
          flex: 1;
          padding: 10px 8px;
          background: none;
          border: none;
          color: #555;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.15s;
          border-right: 1px solid #1e1e1e;
        }
        .diff-btn:last-child { border-right: none; }
        .diff-btn:hover { color: #aaa; background: rgba(255,255,255,0.03); }
        .diff-btn.active { color: #4ade80; background: rgba(74,222,128,0.05); }

        .hud {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #1e1e1e;
          background: #0d0d0d;
        }

        .hud-display {
          background: #000;
          border: 1px solid #1a1a1a;
          border-radius: 2px;
          padding: 6px 12px;
          color: #f87171;
          font-size: 1.4rem;
          letter-spacing: 0.1em;
          min-width: 72px;
          text-align: center;
        }

        .face-btn {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 50%;
          width: 42px;
          height: 42px;
          font-size: 1.3rem;
          cursor: pointer;
          transition: all 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .face-btn:hover { background: #222; transform: scale(1.08); }
        .face-btn:active { transform: scale(0.95); }

        .board-wrap {
          padding: 14px;
          overflow: auto;
          max-width: 100vw;
        }

        .board {
          display: inline-grid;
          gap: 2px;
          border: 1px solid #1e1e1e;
          padding: 6px;
          background: #0d0d0d;
          border-radius: 2px;
        }

        .cell {
          width: 28px;
          height: 28px;
          font-size: 0.75rem;
          font-family: 'Share Tech Mono', monospace;
          font-weight: bold;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.08s, transform 0.08s;
          position: relative;
          user-select: none;
        }

        .cell.hidden {
          background: #1c1c1c;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.4);
          color: #ccc;
        }
        .cell.hidden:hover {
          background: #252525;
          transform: scale(1.05);
        }
        .cell.hidden:active { transform: scale(0.97); background: #181818; }

        .cell.revealed {
          background: #141414;
          cursor: default;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
        }

        .cell.exploded {
          background: #7f1d1d !important;
          animation: explode 0.3s ease-out;
        }
        @keyframes explode {
          0% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }

        .cell.dead-mine {
          background: #1f1414 !important;
        }

        .status-bar {
          padding: 8px 16px;
          border-top: 1px solid #1e1e1e;
          text-align: center;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .status-bar.won { color: #4ade80; }
        .status-bar.lost { color: #f87171; }
        .status-bar.playing { color: #555; }
        .status-bar.idle { color: #555; }
      `}</style>

      <div className="title">Minesweeper</div>
      <div className="subtitle">▸ clear the field · right-click to flag</div>

      <div className="description">
        The minesweeper game board consists of a grid of squares, some of which contain hidden mines. The objective of Minesweeper is to uncover all the squares on the grid that do not contain mines, without detonating any mines. The numbers on the uncovered squares indicate how many mines are adjacent to that square.
      </div>

      <div className="panel">
        <div className="diff-bar">
          {Object.entries(DIFFICULTIES).map(([key, val]) => (
            <button
              key={key}
              className={`diff-btn ${difficulty === key ? "active" : ""}`}
              onClick={() => startGame(key)}
            >{val.label}</button>
          ))}
        </div>

        <div className="hud">
          <div className="hud-display">{String(minesLeft).padStart(3, "0")}</div>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <button className="face-btn" onClick={() => startGame()}>{faceEmoji}</button>
            <button
              className="face-btn"
              onClick={() => setFlagMode(f => !f)}
              title="Toggle flag mode"
              style={{
                background: flagMode ? "rgba(74,222,128,0.15)" : "#1a1a1a",
                border: flagMode ? "1px solid #4ade80" : "1px solid #333",
                fontSize: "1.1rem"
              }}
            >🚩</button>
          </div>
          <div className="hud-display">{String(Math.min(time, 999)).padStart(3, "0")}</div>
        </div>

        <div className="board-wrap">
          <div className="board" style={{ gridTemplateColumns: `repeat(${cfg.cols}, 28px)` }}>
            {board
              ? board.flat().map(cell => renderCell(cell))
              : Array.from({ length: cfg.rows * cfg.cols }, (_, i) => (
                  <button
                    key={i}
                    className="cell hidden"
                    onClick={() => handleClick(Math.floor(i / cfg.cols), i % cfg.cols)}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ))
            }
          </div>
        </div>

        <div className={`status-bar ${gameState}`}>
          {gameState === "won" && `✓ field cleared — ${time}s`}
          {gameState === "lost" && "✗ detonated — click 🙂 to retry"}
          {(gameState === "idle" || gameState === "playing") && (flagMode ? "🚩 flag mode — click to place flags" : `${cfg.mines} mines · ${cfg.rows}×${cfg.cols}`)}
        </div>
      </div>
    </div>
  );
}
