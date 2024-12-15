const { spawn } = require("child_process");
const readline = require("readline");
const Chess = require("chess.js").Chess; // Install this package: npm install chess.js

const STOCKFISH_PATH = "./stockfish/stockfish-macos-m1-apple-silicon"; // Adjust path if needed
const stockfish = spawn(STOCKFISH_PATH);

const rl = readline.createInterface({
  input: stockfish.stdout,
  output: process.stdout,
  terminal: false,
});

const chess = new Chess(); // Initialize the chess board with the starting position
let evaluation = null; // To store the evaluation score

function sendCommand(command) {
  stockfish.stdin.write(`${command}\n`);
  console.log(`Command sent: ${command}`);
}

// Parse Stockfish output
rl.on("line", (line) => {
  if (line.startsWith("info depth")) {
    // Extract evaluation from "info" lines
    const match = line.match(/score (cp|mate) (-?\d+)/);
    if (match) {
      const type = match[1]; // cp or mate
      const value = parseInt(match[2], 10);

      if (type === "cp") {
        evaluation = (value / 100).toFixed(2); // Convert centipawns to pawns
      } else if (type === "mate") {
        evaluation = value > 0 ? `Mate in ${value}` : `Mate in ${-value}`;
      }
    }
  }

  if (line.startsWith("bestmove")) {
    const bestMoveLAN = line.split(" ")[1]; // Extract the best move in LAN
    const move = chess.move(bestMoveLAN); // Make the move and get move details

    if (move) {
      const bestMoveSAN = move.san; // Get SAN format
      const newFEN = chess.fen(); // Get the new FEN after the move

      // Extract start and end squares
      const startSquare = bestMoveLAN.slice(0, 2); // First 2 characters of LAN
      const endSquare = bestMoveLAN.slice(2, 4); // Next 2 characters of LAN

      console.log(`Best Move (LAN): ${bestMoveLAN}`);
      console.log(`Best Move (SAN): ${bestMoveSAN}`);
      console.log(`Start Square: ${startSquare}`);
      console.log(`End Square: ${endSquare}`);
      console.log(`New FEN: ${newFEN}`);
      console.log(`Evaluation: ${evaluation || "Unknown"}`);
    } else {
      console.error("Error: Invalid move from Stockfish.");
    }

    process.exit(0); // Exit the process after output
  }
});

const rlInput = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rlInput.question('Please enter the FEN string: ', (fen) => {
  if (fen.trim() === '') {
    sendCommand("position startpos"); // Start from the initial position
    chess.reset(); // Reset the chess board to the initial position
  } else {
    sendCommand(`position fen ${fen}`); // Use the FEN input
    chess.load(fen); // Load the FEN into the chess instance
  }
  rlInput.close();

  // Initialize Stockfish and send commands after FEN input is confirmed
  sendCommand("uci");
  sendCommand("ucinewgame");
  sendCommand("go depth 15"); // Get the best move at depth 10
});