document.addEventListener('DOMContentLoaded', function() {
    // Game state
    const gameState = {
        board: [],
        turn: 'white',
        selectedSquare: null,
        possibleMoves: [],
        moveHistory: [],
        gameOver: false,
        check: false,
        whiteKingPos: { row: 7, col: 4 },
        blackKingPos: { row: 0, col: 4 },
        castlingRights: {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        },
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1
    };

    // DOM elements
    const chessboard = document.getElementById('chessboard');
    const statusElement = document.getElementById('status');
    const moveHistoryElement = document.getElementById('move-history');
    const newGameButton = document.getElementById('new-game');
    const undoButton = document.getElementById('undo-move');

    // Initialize the board
    function initializeBoard() {
        chessboard.innerHTML = '';
        gameState.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Set up pieces
        // Black pieces (top)
        gameState.board[0][0] = { type: 'rook', color: 'black', hasMoved: false };
        gameState.board[0][1] = { type: 'knight', color: 'black' };
        gameState.board[0][2] = { type: 'bishop', color: 'black' };
        gameState.board[0][3] = { type: 'queen', color: 'black' };
        gameState.board[0][4] = { type: 'king', color: 'black', hasMoved: false };
        gameState.board[0][5] = { type: 'bishop', color: 'black' };
        gameState.board[0][6] = { type: 'knight', color: 'black' };
        gameState.board[0][7] = { type: 'rook', color: 'black', hasMoved: false };
        
        // Black pawns
        for (let col = 0; col < 8; col++) {
            gameState.board[1][col] = { type: 'pawn', color: 'black', hasMoved: false };
        }
        
        // White pieces (bottom)
        gameState.board[7][0] = { type: 'rook', color: 'white', hasMoved: false };
        gameState.board[7][1] = { type: 'knight', color: 'white' };
        gameState.board[7][2] = { type: 'bishop', color: 'white' };
        gameState.board[7][3] = { type: 'queen', color: 'white' };
        gameState.board[7][4] = { type: 'king', color: 'white', hasMoved: false };
        gameState.board[7][5] = { type: 'bishop', color: 'white' };
        gameState.board[7][6] = { type: 'knight', color: 'white' };
        gameState.board[7][7] = { type: 'rook', color: 'white', hasMoved: false };
        
        // White pawns
        for (let col = 0; col < 8; col++) {
            gameState.board[6][col] = { type: 'pawn', color: 'white', hasMoved: false };
        }
        
        renderBoard();
    }

    // Render the board
    function renderBoard() {
        chessboard.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Add coordinates
                if (col === 7) {
                    const rankCoord = document.createElement('span');
                    rankCoord.className = 'coordinates rank-coordinate';
                    rankCoord.textContent = 8 - row;
                    square.appendChild(rankCoord);
                }
                
                if (row === 7) {
                    const fileCoord = document.createElement('span');
                    fileCoord.className = 'coordinates file-coordinate';
                    fileCoord.textContent = String.fromCharCode(97 + col);
                    square.appendChild(fileCoord);
                }
                
                // Add piece if present
                const piece = gameState.board[row][col];
                if (piece) {
                    square.classList.add('has-piece');
                    const icon = document.createElement('i');
                    icon.className = `fas fa-chess-${piece.type}`;
                    icon.style.color = piece.color === 'white' ? '#fff' : '#333';
                    square.appendChild(icon);
                    
                    // Highlight king in check
                    if (piece.type === 'king' && gameState.check && piece.color === gameState.turn) {
                        square.classList.add('check');
                    }
                }
                
                // Highlight selected square and possible moves
                if (gameState.selectedSquare && 
                    gameState.selectedSquare.row === row && 
                    gameState.selectedSquare.col === col) {
                    square.classList.add('selected');
                }
                
                if (gameState.possibleMoves.some(move => move.row === row && move.col === col)) {
                    if (piece && piece.color !== gameState.turn) {
                        square.classList.add('possible-capture');
                    } else {
                        square.classList.add('possible-move');
                    }
                }
                
                square.addEventListener('click', () => handleSquareClick(row, col));
                chessboard.appendChild(square);
            }
        }
        
        // Update status
        updateStatus();
    }

    // Handle square clicks
    function handleSquareClick(row, col) {
        if (gameState.gameOver) return;
        
        const piece = gameState.board[row][col];
        
        // If a piece of the current turn's color is clicked, select it
        if (piece && piece.color === gameState.turn) {
            gameState.selectedSquare = { row, col };
            gameState.possibleMoves = getPossibleMoves(row, col);
            renderBoard();
            return;
        }
        
        // If a square is already selected and this is a possible move
        if (gameState.selectedSquare) {
            const isPossibleMove = gameState.possibleMoves.some(move => 
                move.row === row && move.col === col);
            
            if (isPossibleMove) {
                makeMove(gameState.selectedSquare.row, gameState.selectedSquare.col, row, col);
            } else {
                // If another piece of the same color is clicked, select it instead
                if (piece && piece.color === gameState.turn) {
                    gameState.selectedSquare = { row, col };
                    gameState.possibleMoves = getPossibleMoves(row, col);
                    renderBoard();
                } else {
                    // Deselect if clicking elsewhere
                    gameState.selectedSquare = null;
                    gameState.possibleMoves = [];
                    renderBoard();
                }
            }
        }
    }

    // Get all possible moves for a piece
    function getPossibleMoves(row, col) {
        const piece = gameState.board[row][col];
        if (!piece) return [];
        
        const moves = [];
        
        switch (piece.type) {
            case 'pawn':
                getPawnMoves(row, col, piece.color, moves);
                break;
            case 'rook':
                getRookMoves(row, col, piece.color, moves);
                break;
            case 'knight':
                getKnightMoves(row, col, piece.color, moves);
                break;
            case 'bishop':
                getBishopMoves(row, col, piece.color, moves);
                break;
            case 'queen':
                getQueenMoves(row, col, piece.color, moves);
                break;
            case 'king':
                getKingMoves(row, col, piece.color, moves);
                break;
        }
        
        // Filter out moves that would leave king in check
        return moves.filter(move => {
            // Simulate the move
            const originalBoard = JSON.parse(JSON.stringify(gameState.board));
            const originalEnPassant = gameState.enPassantTarget;
            const originalCastling = JSON.parse(JSON.stringify(gameState.castlingRights));
            
            // Make the move on a copy of the board
            const tempBoard = JSON.parse(JSON.stringify(gameState.board));
            tempBoard[move.row][move.col] = tempBoard[row][col];
            tempBoard[row][col] = null;
            
            // Handle special cases (en passant, castling)
            if (piece.type === 'pawn' && move.enPassant) {
                tempBoard[row][move.col] = null;
            }
            
            if (piece.type === 'king' && Math.abs(move.col - col) === 2) {
                // Castling move
                const rookCol = move.col > col ? 7 : 0;
                const newRookCol = move.col > col ? 5 : 3;
                tempBoard[row][newRookCol] = tempBoard[row][rookCol];
                tempBoard[row][rookCol] = null;
            }
            
            // Check if king would be in check after this move
            const kingPos = piece.type === 'king' ? 
                { row: move.row, col: move.col } : 
                (piece.color === 'white' ? gameState.whiteKingPos : gameState.blackKingPos);
            
            const isSafe = !isSquareUnderAttack(kingPos.row, kingPos.col, piece.color === 'white' ? 'black' : 'white', tempBoard);
            
            // Restore original state
            gameState.board = originalBoard;
            gameState.enPassantTarget = originalEnPassant;
            gameState.castlingRights = originalCastling;
            
            return isSafe;
        });
    }

    // Pawn movement rules
    function getPawnMoves(row, col, color, moves) {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        
        // Forward move
        if (isValidSquare(row + direction, col) && !gameState.board[row + direction][col]) {
            moves.push({ row: row + direction, col });
            
            // Double move from starting position
            if (row === startRow && !gameState.board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col, enPassantable: true });
            }
        }
        
        // Captures
        for (const captureCol of [col - 1, col + 1]) {
            if (captureCol >= 0 && captureCol < 8) {
                // Normal capture
                if (gameState.board[row + direction][captureCol] && 
                    gameState.board[row + direction][captureCol].color !== color) {
                    moves.push({ row: row + direction, col: captureCol });
                }
                
                // En passant
                if (gameState.enPassantTarget && 
                    gameState.enPassantTarget.row === row + direction && 
                    gameState.enPassantTarget.col === captureCol) {
                    moves.push({ row: row + direction, col: captureCol, enPassant: true });
                }
            }
        }
    }

    // Rook movement rules
    function getRookMoves(row, col, color, moves) {
        const directions = [
            { dr: -1, dc: 0 }, // up
            { dr: 1, dc: 0 },  // down
            { dr: 0, dc: -1 }, // left
            { dr: 0, dc: 1 }   // right
        ];
        
        getSlidingMoves(row, col, color, directions, moves);
    }

    // Knight movement rules
    function getKnightMoves(row, col, color, moves) {
        const knightMoves = [
            { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
            { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
            { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
            { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
        ];
        
        for (const move of knightMoves) {
            const newRow = row + move.dr;
            const newCol = col + move.dc;
            
            if (isValidSquare(newRow, newCol)) {
                const piece = gameState.board[newRow][newCol];
                if (!piece || piece.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
    }

    // Bishop movement rules
    function getBishopMoves(row, col, color, moves) {
        const directions = [
            { dr: -1, dc: -1 }, // up-left
            { dr: -1, dc: 1 },  // up-right
            { dr: 1, dc: -1 },  // down-left
            { dr: 1, dc: 1 }    // down-right
        ];
        
        getSlidingMoves(row, col, color, directions, moves);
    }

    // Queen movement rules
    function getQueenMoves(row, col, color, moves) {
        // Queen combines rook and bishop moves
        getRookMoves(row, col, color, moves);
        getBishopMoves(row, col, color, moves);
    }

    // King movement rules
    function getKingMoves(row, col, color, moves) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (isValidSquare(newRow, newCol)) {
                    const piece = gameState.board[newRow][newCol];
                    if (!piece || piece.color !== color) {
                        // Check if the square is under attack
                        if (!isSquareUnderAttack(newRow, newCol, color === 'white' ? 'black' : 'white')) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                }
            }
        }
        
        // Castling
        if (!gameState.board[row][col].hasMoved && !gameState.check) {
            const castlingRights = gameState.castlingRights[color];
            
            // King-side castling
            if (castlingRights.kingSide && 
                !gameState.board[row][5] && 
                !gameState.board[row][6] && 
                !isSquareUnderAttack(row, 5, color === 'white' ? 'black' : 'white') && 
                !isSquareUnderAttack(row, 6, color === 'white' ? 'black' : 'white')) {
                moves.push({ row, col: 6, castling: 'kingSide' });
            }
            
            // Queen-side castling
            if (castlingRights.queenSide && 
                !gameState.board[row][3] && 
                !gameState.board[row][2] && 
                !gameState.board[row][1] && 
                !isSquareUnderAttack(row, 3, color === 'white' ? 'black' : 'white') && 
                !isSquareUnderAttack(row, 2, color === 'white' ? 'black' : 'white')) {
                moves.push({ row, col: 2, castling: 'queenSide' });
            }
        }
    }

    // Helper function for sliding pieces (rook, bishop, queen)
    function getSlidingMoves(row, col, color, directions, moves) {
        for (const dir of directions) {
            let newRow = row + dir.dr;
            let newCol = col + dir.dc;
            
            while (isValidSquare(newRow, newCol)) {
                const piece = gameState.board[newRow][newCol];
                
                if (!piece) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (piece.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                
                newRow += dir.dr;
                newCol += dir.dc;
            }
        }
    }

    // Check if a square is valid (within board bounds)
    function isValidSquare(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Make a move
    function makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = gameState.board[fromRow][fromCol];
        const targetPiece = gameState.board[toRow][toCol];
        
        // Create move notation
        let moveNotation = '';
        
        // Handle castling
        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            // King-side castling
            if (toCol > fromCol) {
                moveNotation = 'O-O';
                // Move rook
                gameState.board[toRow][5] = gameState.board[toRow][7];
                gameState.board[toRow][7] = null;
                gameState.board[toRow][5].hasMoved = true;
            } 
            // Queen-side castling
            else {
                moveNotation = 'O-O-O';
                // Move rook
                gameState.board[toRow][3] = gameState.board[toRow][0];
                gameState.board[toRow][0] = null;
                gameState.board[toRow][3].hasMoved = true;
            }
        } 
        // Normal move
        else {
            // For pawn moves, don't include piece letter
            if (piece.type !== 'pawn') {
                moveNotation = piece.type === 'knight' ? 'N' : piece.type[0].toUpperCase();
            }
            
            // Add capture notation
            if (targetPiece) {
                if (piece.type === 'pawn') {
                    moveNotation += String.fromCharCode(97 + fromCol) + 'x';
                } else {
                    moveNotation += 'x';
                }
            }
            
            // Add destination
            moveNotation += String.fromCharCode(97 + toCol) + (8 - toRow);
            
            // Handle en passant
            const possibleMove = gameState.possibleMoves.find(m => m.row === toRow && m.col === toCol);
            if (possibleMove && possibleMove.enPassant) {
                gameState.board[fromRow][toCol] = null;
                moveNotation = String.fromCharCode(97 + fromCol) + 'x' + 
                                String.fromCharCode(97 + toCol) + (8 - toRow) + ' e.p.';
            }
            
            // Handle promotion
            if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
                // For simplicity, always promote to queen in this implementation
                gameState.board[toRow][toCol] = { type: 'queen', color: piece.color };
                moveNotation += '=Q';
            }
        }
        
        // Update king position
        if (piece.type === 'king') {
            if (piece.color === 'white') {
                gameState.whiteKingPos = { row: toRow, col: toCol };
            } else {
                gameState.blackKingPos = { row: toRow, col: toCol };
            }
        }
        
        // Move the piece
        gameState.board[toRow][toCol] = piece;
        gameState.board[fromRow][fromCol] = null;
        piece.hasMoved = true;
        
        // Update castling rights if rook or king moved
        if (piece.type === 'king') {
            gameState.castlingRights[piece.color] = { kingSide: false, queenSide: false };
        }
        
        if (piece.type === 'rook') {
            if (fromCol === 0) {
                gameState.castlingRights[piece.color].queenSide = false;
            } else if (fromCol === 7) {
                gameState.castlingRights[piece.color].kingSide = false;
            }
        }
        
        // Set en passant target if pawn moved two squares
        gameState.enPassantTarget = null;
        const possibleMove = gameState.possibleMoves.find(m => m.row === toRow && m.col === toCol);
        if (piece.type === 'pawn' && possibleMove && possibleMove.enPassantable) {
            gameState.enPassantTarget = { row: fromRow + (piece.color === 'white' ? -1 : 1), col: toCol };
        }
        
        // Update move history
        if (gameState.turn === 'white') {
            gameState.moveHistory.push({ white: moveNotation, black: null });
        } else {
            gameState.moveHistory[gameState.moveHistory.length - 1].black = moveNotation;
            gameState.fullMoveNumber++;
        }
        
        // Update half-move clock (for 50-move rule)
        if (piece.type === 'pawn' || targetPiece) {
            gameState.halfMoveClock = 0;
        } else {
            gameState.halfMoveClock++;
        }
        
        // Switch turns
        gameState.turn = gameState.turn === 'white' ? 'black' : 'white';
        gameState.selectedSquare = null;
        gameState.possibleMoves = [];
        
        // Check for check/checkmate/stalemate
        updateGameStatus();
        
        // Render the board
        renderBoard();
        
        // If it's AI's turn, make a move
        if (gameState.turn === 'black' && !gameState.gameOver) {
            setTimeout(makeAIMove, 500);
        }
    }

    // Check if a square is under attack
    function isSquareUnderAttack(row, col, byColor, customBoard = null) {
        const board = customBoard || gameState.board;
        
        // Check for pawn attacks
        const pawnDirection = byColor === 'white' ? -1 : 1;
        for (const dc of [-1, 1]) {
            const attackRow = row - pawnDirection;
            const attackCol = col + dc;
            
            if (isValidSquare(attackRow, attackCol) && 
                board[attackRow][attackCol] && 
                board[attackRow][attackCol].type === 'pawn' && 
                board[attackRow][attackCol].color === byColor) {
                return true;
            }
        }
        
        // Check for knight attacks
        const knightMoves = [
            { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
            { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
            { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
            { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
        ];
        
        for (const move of knightMoves) {
            const attackRow = row + move.dr;
            const attackCol = col + move.dc;
            
            if (isValidSquare(attackRow, attackCol)) {
                const piece = board[attackRow][attackCol];
                if (piece && piece.type === 'knight' && piece.color === byColor) {
                    return true;
                }
            }
        }
        
        // Check for sliding pieces (rook, bishop, queen)
        const slidingDirections = [
            { dr: -1, dc: 0, types: ['rook', 'queen'] },  // up
            { dr: 1, dc: 0, types: ['rook', 'queen'] },   // down
            { dr: 0, dc: -1, types: ['rook', 'queen'] },  // left
            { dr: 0, dc: 1, types: ['rook', 'queen'] },   // right
            { dr: -1, dc: -1, types: ['bishop', 'queen'] }, // up-left
            { dr: -1, dc: 1, types: ['bishop', 'queen'] },  // up-right
            { dr: 1, dc: -1, types: ['bishop', 'queen'] },  // down-left
            { dr: 1, dc: 1, types: ['bishop', 'queen'] }    // down-right
        ];
        
        for (const dir of slidingDirections) {
            let attackRow = row + dir.dr;
            let attackCol = col + dir.dc;
            
            while (isValidSquare(attackRow, attackCol)) {
                const piece = board[attackRow][attackCol];
                
                if (piece) {
                    if (piece.color === byColor && dir.types.includes(piece.type)) {
                        return true;
                    }
                    break;
                }
                
                attackRow += dir.dr;
                attackCol += dir.dc;
            }
        }
        
        // Check for king attacks (adjacent squares)
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const attackRow = row + dr;
                const attackCol = col + dc;
                
                if (isValidSquare(attackRow, attackCol)) {
                    const piece = board[attackRow][attackCol];
                    if (piece && piece.type === 'king' && piece.color === byColor) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    // Update game status (check, checkmate, stalemate)
    function updateGameStatus() {
        const currentColor = gameState.turn === 'white' ? 'black' : 'white';
        const kingPos = currentColor === 'white' ? gameState.whiteKingPos : gameState.blackKingPos;
        
        // Check if king is in check
        gameState.check = isSquareUnderAttack(kingPos.row, kingPos.col, gameState.turn);
        
        // Check if current player has any legal moves
        let hasLegalMoves = false;
        for (let row = 0; row < 8 && !hasLegalMoves; row++) {
            for (let col = 0; col < 8 && !hasLegalMoves; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.color === currentColor) {
                    const moves = getPossibleMoves(row, col);
                    if (moves.length > 0) {
                        hasLegalMoves = true;
                    }
                }
            }
        }
        
        // Determine game status
        if (!hasLegalMoves) {
            if (gameState.check) {
                gameState.gameOver = true;
                statusElement.textContent = `Checkmate! ${currentColor === 'white' ? 'White' : 'Black'} wins`;
            } else {
                gameState.gameOver = true;
                statusElement.textContent = 'Stalemate! Game drawn';
            }
        } else if (gameState.check) {
            statusElement.textContent = `${currentColor === 'white' ? 'White' : 'Black'} is in check!`;
        }
        
        // Check for 50-move rule
        if (gameState.halfMoveClock >= 50) {
            gameState.gameOver = true;
            statusElement.textContent = 'Draw by 50-move rule';
        }
        
        // Check for insufficient material
        if (isInsufficientMaterial()) {
            gameState.gameOver = true;
            statusElement.textContent = 'Draw by insufficient material';
        }
    }

    // Check for insufficient material
    function isInsufficientMaterial() {
        let whitePieces = [];
        let blackPieces = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece) {
                    if (piece.color === 'white') {
                        whitePieces.push(piece.type);
                    } else {
                        blackPieces.push(piece.type);
                    }
                }
            }
        }
        
        // King vs king
        if (whitePieces.length === 1 && blackPieces.length === 1) {
            return true;
        }
        
        // King and bishop vs king
        if ((whitePieces.length === 2 && whitePieces.includes('bishop') && 
             blackPieces.length === 1) ||
            (blackPieces.length === 2 && blackPieces.includes('bishop') && 
             whitePieces.length === 1)) {
            return true;
        }
        
        // King and knight vs king
        if ((whitePieces.length === 2 && whitePieces.includes('knight') && 
             blackPieces.length === 1) ||
            (blackPieces.length === 2 && blackPieces.includes('knight') && 
             whitePieces.length === 1)) {
            return true;
        }
        
        // King and bishop vs king and bishop with bishops on same color
        if (whitePieces.length === 2 && whitePieces.includes('bishop') && 
            blackPieces.length === 2 && blackPieces.includes('bishop')) {
            // Find bishops' positions
            let whiteBishopPos, blackBishopPos;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = gameState.board[row][col];
                    if (piece && piece.type === 'bishop') {
                        if (piece.color === 'white') {
                            whiteBishopPos = { row, col };
                        } else {
                            blackBishopPos = { row, col };
                        }
                    }
                }
            }
            
            // Check if bishops are on same color
            if ((whiteBishopPos.row + whiteBishopPos.col) % 2 === 
                (blackBishopPos.row + blackBishopPos.col) % 2) {
                return true;
            }
        }
        
        return false;
    }

    // Update status display
    function updateStatus() {
        statusElement.className = `status ${gameState.turn}-turn`;
        
        if (!gameState.gameOver) {
            statusElement.textContent = `${gameState.turn === 'white' ? 'White' : 'Black'}'s Turn`;
            
            if (gameState.check) {
                statusElement.textContent += ' (Check!)';
            }
        }
        
        // Update move history
        moveHistoryElement.innerHTML = '';
        gameState.moveHistory.forEach((move, index) => {
            const moveEntry = document.createElement('div');
            moveEntry.className = 'move-entry';
            moveEntry.innerHTML = `
                <span>${index + 1}.</span>
                <span>${move.white || ''}</span>
                <span>${move.black || ''}</span>
            `;
            moveHistoryElement.appendChild(moveEntry);
        });
        
        // Scroll to bottom of move history
        moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
    }

    // AI move using Minimax algorithm
    function makeAIMove() {
        const depth = 2; // Adjust depth for stronger/weaker AI
        const bestMove = findBestMove(depth);
        
        if (bestMove) {
            makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
        }
    }

    // Find best move using Minimax with alpha-beta pruning
    function findBestMove(depth) {
        const possibleMoves = getAllPossibleMoves('black');
        let bestMove = null;
        let bestValue = -Infinity;
        
        for (const move of possibleMoves) {
            // Make the move on a copy of the board
            const originalBoard = JSON.parse(JSON.stringify(gameState.board));
            const originalWhiteKingPos = {...gameState.whiteKingPos};
            const originalBlackKingPos = {...gameState.blackKingPos};
            const originalCastling = JSON.parse(JSON.stringify(gameState.castlingRights));
            const originalEnPassant = gameState.enPassantTarget;
            
            makeMoveOnBoard(move.from.row, move.from.col, move.to.row, move.to.col);
            
            // Evaluate the move
            const moveValue = minimax(depth - 1, -Infinity, Infinity, false);
            
            // Undo the move
            gameState.board = originalBoard;
            gameState.whiteKingPos = originalWhiteKingPos;
            gameState.blackKingPos = originalBlackKingPos;
            gameState.castlingRights = originalCastling;
            gameState.enPassantTarget = originalEnPassant;
            
            // Update best move
            if (moveValue > bestValue) {
                bestValue = moveValue;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    // Minimax algorithm with alpha-beta pruning
    function minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return evaluateBoard();
        }
        
        const currentColor = isMaximizing ? 'black' : 'white';
        const possibleMoves = getAllPossibleMoves(currentColor);
        
        if (possibleMoves.length === 0) {
            // Checkmate or stalemate
            const kingPos = currentColor === 'white' ? gameState.whiteKingPos : gameState.blackKingPos;
            if (isSquareUnderAttack(kingPos.row, kingPos.col, currentColor === 'white' ? 'black' : 'white')) {
                return isMaximizing ? -1000 + depth : 1000 - depth; // Checkmate
            }
            return 0; // Stalemate
        }
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            
            for (const move of possibleMoves) {
                // Make the move on a copy of the board
                const originalBoard = JSON.parse(JSON.stringify(gameState.board));
                const originalWhiteKingPos = {...gameState.whiteKingPos};
                const originalBlackKingPos = {...gameState.blackKingPos};
                const originalCastling = JSON.parse(JSON.stringify(gameState.castlingRights));
                const originalEnPassant = gameState.enPassantTarget;
                
                makeMoveOnBoard(move.from.row, move.from.col, move.to.row, move.to.col);
                
                const evaluation = minimax(depth - 1, alpha, beta, false);
                
                // Undo the move
                gameState.board = originalBoard;
                gameState.whiteKingPos = originalWhiteKingPos;
                gameState.blackKingPos = originalBlackKingPos;
                gameState.castlingRights = originalCastling;
                gameState.enPassantTarget = originalEnPassant;
                
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    break; // Beta cutoff
                }
            }
            
            return maxEval;
        } else {
            let minEval = Infinity;
            
            for (const move of possibleMoves) {
                // Make the move on a copy of the board
                const originalBoard = JSON.parse(JSON.stringify(gameState.board));
                const originalWhiteKingPos = {...gameState.whiteKingPos};
                const originalBlackKingPos = {...gameState.blackKingPos};
                const originalCastling = JSON.parse(JSON.stringify(gameState.castlingRights));
                const originalEnPassant = gameState.enPassantTarget;
                
                makeMoveOnBoard(move.from.row, move.from.col, move.to.row, move.to.col);
                
                const evaluation = minimax(depth - 1, alpha, beta, true);
                
                // Undo the move
                gameState.board = originalBoard;
                gameState.whiteKingPos = originalWhiteKingPos;
                gameState.blackKingPos = originalBlackKingPos;
                gameState.castlingRights = originalCastling;
                gameState.enPassantTarget = originalEnPassant;
                
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) {
                    break; // Alpha cutoff
                }
            }
            
            return minEval;
        }
    }

    // Evaluate the board position
    function evaluateBoard() {
        let score = 0;
        
        // Piece values
        const pieceValues = {
            pawn: 10,
            knight: 30,
            bishop: 30,
            rook: 50,
            queen: 90,
            king: 900
        };
        
        // Positional bonuses
        const pawnEvalWhite = [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [5, 5, 5, 5, 5, 5, 5, 5],
            [1, 1, 2, 3, 3, 2, 1, 1],
            [0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5],
            [0, 0, 0, 2, 2, 0, 0, 0],
            [0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5],
            [0.5, 1, 1, -2, -2, 1, 1, 0.5],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ];
        
        const pawnEvalBlack = pawnEvalWhite.slice().reverse();
        
        const knightEval = [
            [-5, -4, -3, -3, -3, -3, -4, -5],
            [-4, -2, 0, 0, 0, 0, -2, -4],
            [-3, 0, 1, 1.5, 1.5, 1, 0, -3],
            [-3, 0.5, 1.5, 2, 2, 1.5, 0.5, -3],
            [-3, 0, 1.5, 2, 2, 1.5, 0, -3],
            [-3, 0.5, 1, 1.5, 1.5, 1, 0.5, -3],
            [-4, -2, 0, 0.5, 0.5, 0, -2, -4],
            [-5, -4, -3, -3, -3, -3, -4, -5]
        ];
        
        const bishopEvalWhite = [
            [-2, -1, -1, -1, -1, -1, -1, -2],
            [-1, 0, 0, 0, 0, 0, 0, -1],
            [-1, 0, 0.5, 1, 1, 0.5, 0, -1],
            [-1, 0.5, 0.5, 1, 1, 0.5, 0.5, -1],
            [-1, 0, 1, 1, 1, 1, 0, -1],
            [-1, 1, 1, 1, 1, 1, 1, -1],
            [-1, 0.5, 0, 0, 0, 0, 0.5, -1],
            [-2, -1, -1, -1, -1, -1, -1, -2]
        ];
        
        const bishopEvalBlack = bishopEvalWhite.slice().reverse();
        
        const rookEvalWhite = [
            [0, 0, 0, 0.5, 0.5, 0, 0, 0],
            [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
            [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
            [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
            [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
            [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
            [0.5, 1, 1, 1, 1, 1, 1, 0.5],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ];
        
        const rookEvalBlack = rookEvalWhite.slice().reverse();
        
        const evalQueen = [
            [-2, -1, -1, -0.5, -0.5, -1, -1, -2],
            [-1, 0, 0, 0, 0, 0, 0, -1],
            [-1, 0, 0.5, 0.5, 0.5, 0.5, 0, -1],
            [-0.5, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5],
            [0, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5],
            [-1, 0.5, 0.5, 0.5, 0.5, 0.5, 0, -1],
            [-1, 0, 0.5, 0, 0, 0, 0, -1],
            [-2, -1, -1, -0.5, -0.5, -1, -1, -2]
        ];
        
        const kingEvalWhite = [
            [-3, -4, -4, -5, -5, -4, -4, -3],
            [-3, -4, -4, -5, -5, -4, -4, -3],
            [-3, -4, -4, -5, -5, -4, -4, -3],
            [-3, -4, -4, -5, -5, -4, -4, -3],
            [-2, -3, -3, -4, -4, -3, -3, -2],
            [-1, -2, -2, -2, -2, -2, -2, -1],
            [2, 2, 0, 0, 0, 0, 2, 2],
            [2, 3, 1, 0, 0, 1, 3, 2]
        ];
        
        const kingEvalBlack = kingEvalWhite.slice().reverse();
        
        // Evaluate pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece) {
                    const value = pieceValues[piece.type];
                    let positionalBonus = 0;
                    
                    // Add positional bonuses
                    if (piece.type === 'pawn') {
                        positionalBonus = piece.color === 'white' ? 
                            pawnEvalWhite[row][col] : pawnEvalBlack[row][col];
                    } else if (piece.type === 'knight') {
                        positionalBonus = knightEval[row][col];
                    } else if (piece.type === 'bishop') {
                        positionalBonus = piece.color === 'white' ? 
                            bishopEvalWhite[row][col] : bishopEvalBlack[row][col];
                    } else if (piece.type === 'rook') {
                        positionalBonus = piece.color === 'white' ? 
                            rookEvalWhite[row][col] : rookEvalBlack[row][col];
                    } else if (piece.type === 'queen') {
                        positionalBonus = evalQueen[row][col];
                    } else if (piece.type === 'king') {
                        positionalBonus = piece.color === 'white' ? 
                            kingEvalWhite[row][col] : kingEvalBlack[row][col];
                    }
                    
                    // Add to score (positive for white, negative for black)
                    score += piece.color === 'white' ? 
                        (value + positionalBonus) : -(value + positionalBonus);
                }
            }
        }
        
        // Add bonus for castling rights
        if (gameState.castlingRights.white.kingSide) score += 1;
        if (gameState.castlingRights.white.queenSide) score += 1;
        if (gameState.castlingRights.black.kingSide) score -= 1;
        if (gameState.castlingRights.black.queenSide) score -= 1;
        
        // Add penalty for doubled pawns
        for (let col = 0; col < 8; col++) {
            let whitePawns = 0;
            let blackPawns = 0;
            
            for (let row = 0; row < 8; row++) {
                const piece = gameState.board[row][col];
                if (piece && piece.type === 'pawn') {
                    if (piece.color === 'white') whitePawns++;
                    else blackPawns++;
                }
            }
            
            if (whitePawns > 1) score -= 0.5 * (whitePawns - 1);
            if (blackPawns > 1) score += 0.5 * (blackPawns - 1);
        }
        
        // Add penalty for isolated pawns
        for (let col = 0; col < 8; col++) {
            const hasWhitePawn = Array(8).fill().some((_, row) => {
                const piece = gameState.board[row][col];
                return piece && piece.type === 'pawn' && piece.color === 'white';
            });
            
            const hasBlackPawn = Array(8).fill().some((_, row) => {
                const piece = gameState.board[row][col];
                return piece && piece.type === 'pawn' && piece.color === 'black';
            });
            
            const hasWhiteNeighbor = (col > 0 && Array(8).fill().some((_, row) => {
                const piece = gameState.board[row][col - 1];
                return piece && piece.type === 'pawn' && piece.color === 'white';
            })) || (col < 7 && Array(8).fill().some((_, row) => {
                const piece = gameState.board[row][col + 1];
                return piece && piece.type === 'pawn' && piece.color === 'white';
            }));
            
            const hasBlackNeighbor = (col > 0 && Array(8).fill().some((_, row) => {
                const piece = gameState.board[row][col - 1];
                return piece && piece.type === 'pawn' && piece.color === 'black';
            })) || (col < 7 && Array(8).fill().some((_, row) => {
                const piece = gameState.board[row][col + 1];
                return piece && piece.type === 'pawn' && piece.color === 'black';
            }));
            
            if (hasWhitePawn && !hasWhiteNeighbor) score -= 0.5;
            if (hasBlackPawn && !hasBlackNeighbor) score += 0.5;
        }
        
        return score;
    }

    // Get all possible moves for a color
    function getAllPossibleMoves(color) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = getPossibleMoves(row, col);
                    pieceMoves.forEach(move => {
                        moves.push({
                            from: { row, col },
                            to: { row: move.row, col: move.col },
                            isCapture: !!gameState.board[move.row][move.col],
                            piece: piece.type
                        });
                    });
                }
            }
        }
        
        return moves;
    }

    // Make a move on the board (without updating game state)
    function makeMoveOnBoard(fromRow, fromCol, toRow, toCol) {
        const piece = gameState.board[fromRow][fromCol];
        gameState.board[toRow][toCol] = piece;
        gameState.board[fromRow][fromCol] = null;
        piece.hasMoved = true;
        
        // Update king position
        if (piece.type === 'king') {
            if (piece.color === 'white') {
                gameState.whiteKingPos = { row: toRow, col: toCol };
            } else {
                gameState.blackKingPos = { row: toRow, col: toCol };
            }
            
            // Handle castling
            if (Math.abs(toCol - fromCol) === 2) {
                if (toCol > fromCol) {
                    // King-side castling
                    gameState.board[toRow][5] = gameState.board[toRow][7];
                    gameState.board[toRow][7] = null;
                } else {
                    // Queen-side castling
                    gameState.board[toRow][3] = gameState.board[toRow][0];
                    gameState.board[toRow][0] = null;
                }
            }
        }
        
        // Handle en passant
        if (piece.type === 'pawn' && gameState.enPassantTarget && 
            gameState.enPassantTarget.row === toRow && 
            gameState.enPassantTarget.col === toCol) {
            gameState.board[fromRow][toCol] = null;
        }
        
        // Handle promotion (always to queen for simplicity)
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            gameState.board[toRow][toCol] = { type: 'queen', color: piece.color };
        }
    }

    // New game button
    newGameButton.addEventListener('click', function() {
        gameState.turn = 'white';
        gameState.selectedSquare = null;
        gameState.possibleMoves = [];
        gameState.moveHistory = [];
        gameState.gameOver = false;
        gameState.check = false;
        gameState.fullMoveNumber = 1;
        gameState.halfMoveClock = 0;
        gameState.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        gameState.enPassantTarget = null;
        
        initializeBoard();
    });

    // Undo move button (simplified - only works for human moves)
    undoButton.addEventListener('click', function() {
        if (gameState.moveHistory.length === 0 || gameState.turn === 'black') {
            return; // Can't undo AI's move in this simple implementation
        }
        
        // In a full implementation, you would need to maintain a move stack
        // This is a simplified version that just restarts the game
        newGameButton.click();
    });

    // Initialize the game
    initializeBoard();
});