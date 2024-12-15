const readline = require("readline");
const { spawn } = require("child_process");
const Chess = require("chess.js").Chess;
const chess = new Chess();

const stockfish = spawn("stockfish");

const rlInput = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let moveCount = 0;
let staticEvaluation = null; // To store Static Evaluation (SV)
let principalVariation = null; // To store PV

rlInput.question("Please enter the FEN string: ", (fen) => {
  if (fen.trim() === "") {
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
  sendCommand("go depth 15"); // Get the best move at depth 15
});

function sendCommand(command) {
  console.log(`Command sent: ${command}`);
  stockfish.stdin.write(command + "\n");
}

// Parse Stockfish output
stockfish.stdout.on("data", (data) => {
  const lines = data.toString().split("\n");
  lines.forEach((line) => {
    if (line.startsWith("info depth") && moveCount === 0) {
      // Only calculate SV and PV for the first move
      const evalMatch = line.match(/score (cp|mate) (-?\d+)/);
      const pvMatch = line.match(/ pv (.+)/);

      if (evalMatch) {
        const type = evalMatch[1]; // cp or mate
        const value = parseInt(evalMatch[2], 10);

        if (type === "cp") {
          staticEvaluation = (value / 100).toFixed(2); // Convert centipawns to pawns
        } else if (type === "mate") {
          staticEvaluation = value > 0 ? `Mate in ${value}` : `Mate in ${-value}`;
        }
      }

      if (pvMatch) {
        principalVariation = pvMatch[1]; // Store PV sequence
      }
    }

    if (line.startsWith("bestmove")) {
      const bestMoveLAN = line.split(" ")[1]; // Extract the best move in LAN
      const move = chess.move(bestMoveLAN); // Make the move and get move details

      if (move) {
        const bestMoveSAN = move.san; // Get SAN format
        const newFEN = chess.fen(); // Get the new FEN after the move

        if (moveCount === 0) {
          // Display SV and PV only for the first move
          console.log(`Static Evaluation (SV): ${staticEvaluation || "Unknown"}`);
          console.log(`Principal Variation (PV): ${principalVariation || "Unknown"}`);
        }

        // Display the best move information
        console.log(`Best Move (LAN): ${bestMoveLAN}`);
        console.log(`Best Move (SAN): ${bestMoveSAN}`);
        console.log(`New FEN: ${newFEN}`);

        moveCount++;

        if (moveCount < 3) {
          // Get the next best move
          sendCommand(`position fen ${newFEN}`);
          sendCommand("go depth 15");
        } else {
          process.exit(0); // Exit after three moves
        }
      } else {
        console.error("Error: Invalid move from Stockfish.");
        process.exit(1); // Exit the process on error
      }
    }
  });
});
