document.addEventListener('DOMContentLoaded', () => {
    // --- États de l'Application ---
    let gameState = {
        players: [], // { name: string, score: number, bidsHistory: [], tricksHistory: [], contractsMade: 0, contractsBroken: 0 }
        numPlayers: 0,
        currentRound: 0, // Index de la manche actuelle (0-indexed)
        totalRounds: 0,
        roundCardSequence: [], // [1, 2, 3, ..., N, N-1, ..., 1]
        currentDealerIndex: 0,
        currentPhase: 'bidding', // 'bidding' ou 'tricks'
        roundHistory: [] // [{ roundNum, cards, dealer, bids: {playerName: bid}, tricks: {playerName: tricks}, scoresChange: {playerName: change} }]
    };

    // --- Éléments du DOM ---
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const endGameScreen = document.getElementById('end-game-screen');
    const numPlayersSelect = document.getElementById('num-players');
    const playerNamesInputsDiv = document.getElementById('player-names-inputs');
    const startGameBtn = document.getElementById('start-game-btn');
    const loadGameBtn = document.getElementById('load-game-btn');
    const errorSetup = document.getElementById('error-setup');

    const roundTitle = document.getElementById('round-title');
    const currentDealerSpan = document.getElementById('current-dealer');
    // const currentTrumpInfoSpan = document.getElementById('current-trump-info'); // Info seulement textuelle

    const biddingPhaseDiv = document.getElementById('bidding-phase');
    const bidsInputsDiv = document.getElementById('bids-inputs');
    const totalBidsSpan = document.getElementById('total-bids');
    const cardsInRoundDisplaySpan = document.getElementById('cards-in-round-display');
    const submitBidsBtn = document.getElementById('submit-bids-btn');
    const errorBids = document.getElementById('error-bids');

    const tricksPhaseDiv = document.getElementById('tricks-phase');
    const tricksInputsDiv = document.getElementById('tricks-inputs');
    const totalTricksMadeSpan = document.getElementById('total-tricks-made');
    const cardsInRoundDisplayTricksSpan = document.getElementById('cards-in-round-display-tricks');
    const submitTricksBtn = document.getElementById('submit-tricks-btn');
    const errorTricks = document.getElementById('error-tricks');

    const scoresTbody = document.getElementById('scores-tbody');
    const cancelGameBtn = document.getElementById('cancel-game-btn');

    const winnerNameSpan = document.getElementById('winner-name');
    const finalScoresTbody = document.getElementById('final-scores-tbody');
    const scoreEvolutionChartCtx = document.getElementById('score-evolution-chart')?.getContext('2d');
    const contractsChartCtx = document.getElementById('contracts-chart')?.getContext('2d');
    const fullSummaryTableContainer = document.getElementById('full-summary-table-container');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const createTestGameBtn = document.getElementById('create-test-game-btn');
    const autoFillScoresBtn = document.getElementById('auto-fill-scores-btn');

    let scoreEvolutionChartInstance = null;
    let contractsChartInstance = null;

    // --- Fonctions Utilitaires ---
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
        document.getElementById(screenId).classList.add('active-screen');
    }

    function saveGameState() {
        localStorage.setItem('escalierGameState', JSON.stringify(gameState));
    }

    function loadGameState() {
        const savedState = localStorage.getItem('escalierGameState');
        if (savedState) {
            gameState = JSON.parse(savedState);
            return true;
        }
        return false;
    }

    function clearGameState() {
        localStorage.removeItem('escalierGameState');
        // Réinitialiser gameState à son état initial ou vide
        gameState = { /* ... structure vide ... */ players: [], roundHistory: []};
    }

    // --- Logique de Configuration ---
    numPlayersSelect.addEventListener('change', generatePlayerNameInputs);
    startGameBtn.addEventListener('click', initializeNewGame);
    loadGameBtn.addEventListener('click', resumeGame);
    cancelGameBtn.addEventListener('click', handleCancelGame);
    newGameBtn.addEventListener('click', () => {
        clearGameState();
        showScreen('setup-screen');
        checkExistingGame(); // Pour réafficher le bouton "Reprendre" s'il y a une autre partie sauvegardée (peu probable ici)
    });


    function generatePlayerNameInputs() {
        const num = parseInt(numPlayersSelect.value);
        playerNamesInputsDiv.innerHTML = '';
        for (let i = 0; i < num; i++) {
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.setAttribute('for', `player-name-${i}`);
            label.textContent = `Nom Joueur ${i + 1}:`;
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `player-name-${i}`;
            input.placeholder = `Joueur ${i + 1}`;
            input.required = true;
            div.appendChild(label);
            div.appendChild(input);
            playerNamesInputsDiv.appendChild(div);
        }
    }

    function initializeNewGame() {
        errorSetup.textContent = '';
        const num = parseInt(numPlayersSelect.value);
        gameState.numPlayers = num;
        gameState.players = [];
        const nameInputs = playerNamesInputsDiv.querySelectorAll('input[type="text"]');
        let allNamesValid = true;
        nameInputs.forEach((input, index) => {
            if (!input.value.trim()) {
                allNamesValid = false;
            }
            gameState.players.push({
                name: input.value.trim() || `Joueur ${index + 1}`,
                score: 0,
                bidsHistory: [], // Pour stocker les annonces de chaque manche
                tricksHistory: [], // Pour stocker les levées faites à chaque manche
                contractsMade: 0,
                contractsBroken: 0
            });
        });

        if (!allNamesValid) {
            errorSetup.textContent = 'Veuillez entrer un nom pour chaque joueur.';
            return;
        }

        // Déterminer la séquence des manches
        let maxCards;
        if (num === 4 || num === 5) { // 10 croissantes + 10 décroissantes = 20 manches
            maxCards = 10; // Fixé à 10 pour ces cas spécifiques
        } else if (num === 6) { // 9 croissantes + 9 décroissantes = 18 manches
            maxCards = 9;
        } else {
            maxCards = Math.floor((52 - 1) / num); // Cas général
        }
        if (maxCards < 1) maxCards = 1; // Au cas où

        gameState.roundCardSequence = [];
        for (let i = 1; i <= maxCards; i++) gameState.roundCardSequence.push(i);
        for (let i = maxCards; i >= 1; i--) gameState.roundCardSequence.push(i); // Inclure le max dans la séquence décroissante

        gameState.totalRounds = gameState.roundCardSequence.length; // Corrige le calcul du total des manches
        gameState.currentRound = 0;
        gameState.currentDealerIndex = 0; // Le premier joueur est le premier donneur
        gameState.currentPhase = 'bidding';
        gameState.roundHistory = [];

        saveGameState();
        startGameUI();
    }

    function resumeGame() {
        if (loadGameState()) {
            // S'assurer que les éléments DOM dynamiques sont prêts si nécessaire
            // Par exemple, si le jeu s'est arrêté en phase d'annonce, il faut reconstruire les inputs
            startGameUI(true); // true pour indiquer une reprise
        } else {
            alert("Aucune partie sauvegardée trouvée.");
            checkExistingGame(); // Mettre à jour l'affichage du bouton
        }
    }

    function handleCancelGame() {
        if (confirm("Êtes-vous sûr de vouloir annuler la partie en cours ? Toute la progression sera perdue.")) {
            clearGameState();
            showScreen('setup-screen');
            generatePlayerNameInputs(); // Re-générer les inputs par défaut
            checkExistingGame();
        }
    }

    // --- Logique de Jeu ---
    function startGameUI(isResuming = false) {
        showScreen('game-screen');
        tricksPhaseDiv.style.display = 'none';
        biddingPhaseDiv.style.display = 'block';

        if (isResuming) {
            // Si on reprend, il faut potentiellement restaurer l'état de la phase (bidding/tricks)
            // et les valeurs déjà entrées pour la manche en cours si applicable.
            // Pour l'instant, on suppose qu'on reprend toujours au début d'une manche (bidding).
            // Une gestion plus fine serait d'enregistrer aussi les bids/tricks partiels de la manche.
            if (gameState.currentPhase === 'tricks') {
                setupTricksPhase(); // Si on était en phase de levées
            } else {
                setupBiddingPhase(); // Sinon, phase d'annonce
            }
        } else {
            setupBiddingPhase();
        }
        updateLiveScoreboard();
    }

    function setupBiddingPhase() {
        gameState.currentPhase = 'bidding';
        const currentCards = gameState.roundCardSequence[gameState.currentRound];
        const currentRoundDisplay = gameState.currentRound + 1; // Corrige l'affichage pour être 1-indexé
        roundTitle.textContent = `Manche ${currentRoundDisplay} / ${gameState.totalRounds} (${currentCards} carte${currentCards > 1 ? 's' : ''})`;
        currentDealerSpan.textContent = gameState.players[gameState.currentDealerIndex].name;

        bidsInputsDiv.innerHTML = '';
        gameState.players.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = 'input-group';
            const label = document.createElement('label');
            label.setAttribute('for', `bid-player-${index}`);
            label.textContent = `${player.name}:`;
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `bid-player-${index}`;
            input.min = '0';
            input.max = currentCards.toString();
            input.value = '0'; // Default bid
            input.dataset.playerId = index; // Pour identifier le joueur
            input.addEventListener('input', updateTotalBids);
            div.appendChild(label);
            div.appendChild(input);
            bidsInputsDiv.appendChild(div);
        });

        cardsInRoundDisplaySpan.textContent = currentCards.toString();
        updateTotalBids(); // Mettre à jour avec les valeurs par défaut
        biddingPhaseDiv.style.display = 'block';
        tricksPhaseDiv.style.display = 'none';
        errorBids.textContent = '';
    }

    function updateTotalBids() {
        const bidInputs = bidsInputsDiv.querySelectorAll('input[type="number"]');
        let total = 0;
        bidInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        totalBidsSpan.textContent = total;
    }

    submitBidsBtn.addEventListener('click', () => {
        errorBids.textContent = '';
        const bidInputs = bidsInputsDiv.querySelectorAll('input[type="number"]');
        const currentCards = gameState.roundCardSequence[gameState.currentRound];
        let totalBids = 0;
        const currentBids = {};

        let allBidsValid = true;
        bidInputs.forEach(input => {
            const bidValue = parseInt(input.value);
            if (isNaN(bidValue) || bidValue < 0 || bidValue > currentCards) {
                allBidsValid = false;
            }
            totalBids += bidValue;
            currentBids[gameState.players[parseInt(input.dataset.playerId)].name] = bidValue;
        });

        if (!allBidsValid) {
            errorBids.textContent = `Les annonces doivent être entre 0 et ${currentCards}.`;
            return;
        }

        // Supprimer cette vérification
        // if (totalBids === currentCards) {
        //     errorBids.textContent = `Le total des annonces (${totalBids}) ne doit pas être égal au nombre de cartes (${currentCards}).`;
        //     return;
        // }

        // Stocker les annonces pour la manche en cours (temporairement ou dans roundHistory)
        if (!gameState.roundHistory[gameState.currentRound]) {
            gameState.roundHistory[gameState.currentRound] = {
                roundNum: gameState.currentRound + 1,
                cards: currentCards,
                dealer: gameState.players[gameState.currentDealerIndex].name,
            };
        }
        gameState.roundHistory[gameState.currentRound].bids = currentBids;

        // Passer à la phase de saisie des levées
        setupTricksPhase();
    });

    function setupTricksPhase() {
        gameState.currentPhase = 'tricks';
        const currentCards = gameState.roundCardSequence[gameState.currentRound];

        tricksInputsDiv.innerHTML = '';
        gameState.players.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = 'input-group';
            const label = document.createElement('label');
            label.setAttribute('for', `trick-player-${index}`);
            label.textContent = `${player.name} (Annonce: ${gameState.roundHistory[gameState.currentRound].bids[player.name]}):`;
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `trick-player-${index}`;
            input.min = '0';
            input.max = currentCards.toString();
            input.value = '0'; // Default tricks
            input.dataset.playerId = index;
            input.addEventListener('input', updateTotalTricksMade);
            div.appendChild(label);
            div.appendChild(input);
            tricksInputsDiv.appendChild(div);
        });

        cardsInRoundDisplayTricksSpan.textContent = currentCards.toString();
        updateTotalTricksMade();
        biddingPhaseDiv.style.display = 'none';
        tricksPhaseDiv.style.display = 'block';
        errorTricks.textContent = '';
    }

    function updateTotalTricksMade() {
        const trickInputs = tricksInputsDiv.querySelectorAll('input[type="number"]');
        let total = 0;
        trickInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        totalTricksMadeSpan.textContent = total;
    }

    submitTricksBtn.addEventListener('click', () => {
        errorTricks.textContent = '';
        const trickInputs = tricksInputsDiv.querySelectorAll('input[type="number"]');
        const currentCards = gameState.roundCardSequence[gameState.currentRound];
        let totalTricks = 0;
        const currentTricks = {};
        let allTricksValid = true;

        trickInputs.forEach(input => {
            const tricksValue = parseInt(input.value);
            if (isNaN(tricksValue) || tricksValue < 0 || tricksValue > currentCards) {
                allTricksValid = false;
            }
            totalTricks += tricksValue;
            currentTricks[gameState.players[parseInt(input.dataset.playerId)].name] = tricksValue;
        });

        if (!allTricksValid) {
            errorTricks.textContent = `Les levées doivent être entre 0 et ${currentCards}.`;
            return;
        }

        if (totalTricks !== currentCards) {
            errorTricks.textContent = `Le total des levées (${totalTricks}) doit être égal au nombre de cartes (${currentCards}).`;
            return;
        }

        // Enregistrer les levées et calculer les scores
        gameState.roundHistory[gameState.currentRound].tricks = currentTricks;
        calculateRoundScores();
        updateLiveScoreboard();

        // Passer à la manche suivante ou terminer le jeu
        gameState.currentRound++;
        if (gameState.currentRound >= gameState.totalRounds) {
            endGame();
        } else {
            gameState.currentDealerIndex = (gameState.currentDealerIndex + 1) % gameState.numPlayers;
            setupBiddingPhase();
        }
        saveGameState();
    });

    function calculateRoundScores() {
        const roundData = gameState.roundHistory[gameState.currentRound];
        roundData.scoresChange = {};

        gameState.players.forEach(player => {
            const bid = roundData.bids[player.name];
            const tricksWon = roundData.tricks[player.name];
            let scoreChange = 0;

            player.bidsHistory.push(bid); // Pour stats de fin de partie
            player.tricksHistory.push(tricksWon); // Pour stats de fin de partie

            if (bid === tricksWon) { // Contrat réussi
                scoreChange = 5 + (5 * tricksWon);
                player.contractsMade++;
            } else { // Contrat échoué
                const diff = Math.abs(bid - tricksWon);
                scoreChange = -(5 + (5 * diff));
                player.contractsBroken++;
            }
            player.score += scoreChange;
            roundData.scoresChange[player.name] = scoreChange;
        });
    }

    function updateLiveScoreboard() {
        scoresTbody.innerHTML = '';
        gameState.players.forEach(player => {
            const tr = scoresTbody.insertRow();
            tr.insertCell().textContent = player.name;
            tr.insertCell().textContent = player.score;
        });
    }

    // --- Fin de Partie ---
    function endGame() {
        showScreen('end-game-screen');
        // Trier les joueurs par score pour trouver le gagnant
        const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
        winnerNameSpan.textContent = sortedPlayers[0].name + ` (avec ${sortedPlayers[0].score} points)`;

        // Remplir le tableau des scores finaux
        finalScoresTbody.innerHTML = '';
        sortedPlayers.forEach(player => {
            const tr = finalScoresTbody.insertRow();
            tr.insertCell().textContent = player.name;
            tr.insertCell().textContent = player.score;
            tr.insertCell().textContent = player.contractsMade;
            tr.insertCell().textContent = player.contractsBroken;
        });

        generateCharts();
        generateFullSummaryTable();
        // Le localStorage est effacé seulement si on commence une "Nouvelle Partie"
        // pour permettre de revoir les stats plus tard si on recharge la page.
        // Ou ajouter un bouton "Terminer et effacer"
    }

    function generateCharts() {
        if (scoreEvolutionChartInstance) scoreEvolutionChartInstance.destroy();
        if (contractsChartInstance) contractsChartInstance.destroy();

        // Graphique d'évolution des scores
        const labels = Array.from({ length: gameState.totalRounds }, (_, i) => `Manche ${i + 1}`);
        const datasetsScore = gameState.players.map(player => {
            const scoresOverTime = [0]; // Score avant la première manche
            let currentScore = 0;
            gameState.roundHistory.forEach(round => {
                currentScore += (round.scoresChange[player.name] || 0);
                scoresOverTime.push(currentScore);
            });
            return {
                label: player.name,
                data: scoresOverTime.slice(1), // Exclure le 0 initial si on veut commencer à la manche 1
                borderColor: getRandomColor(),
                tension: 0.1,
                fill: false
            };
        });

        if (scoreEvolutionChartCtx) {
           scoreEvolutionChartInstance = new Chart(scoreEvolutionChartCtx, {
                type: 'line',
                data: { labels, datasets: datasetsScore },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: 'Évolution des Scores' } }
                }
            });
        }


        // Graphique des contrats
        const contractsData = {
            labels: gameState.players.map(p => p.name),
            datasets: [
                {
                    label: 'Contrats Réussis',
                    data: gameState.players.map(p => p.contractsMade),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                },
                {
                    label: 'Contrats Rompus',
                    data: gameState.players.map(p => p.contractsBroken),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                }
            ]
        };
        if (contractsChartCtx) {
            contractsChartInstance = new Chart(contractsChartCtx, {
                type: 'bar',
                data: contractsData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: 'Performance des Contrats' } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    }

    function getRandomColor() { // Pour les graphiques
        const r = Math.floor(Math.random() * 200);
        const g = Math.floor(Math.random() * 200);
        const b = Math.floor(Math.random() * 200);
        return `rgb(${r},${g},${b})`;
    }

    function generateFullSummaryTable() {
        fullSummaryTableContainer.innerHTML = ''; // Vider le conteneur
        const table = document.createElement('table');
        table.id = 'full-summary-content-table'; // ID pour le PDF
        table.className = 'summary-table'; // Classe pour styliser le tableau
        const thead = table.createTHead();
        const tbody = table.createTBody();

        // En-tête du tableau
        const headerRow = thead.insertRow();
        headerRow.insertCell().textContent = 'Manche';
        headerRow.insertCell().textContent = 'Cartes';
        headerRow.insertCell().textContent = 'Donneur';
        gameState.players.forEach(player => {
            const thBid = headerRow.insertCell();
            thBid.textContent = `${player.name} (Annonce)`;
            const thTrick = headerRow.insertCell();
            thTrick.textContent = `${player.name} (Fait)`;
            const thScore = headerRow.insertCell();
            thScore.textContent = `${player.name} (Score Manche)`;
        });

        // Corps du tableau
        gameState.roundHistory.forEach(round => {
            const row = tbody.insertRow();
            row.insertCell().textContent = round.roundNum;
            row.insertCell().textContent = round.cards;
            row.insertCell().textContent = round.dealer;
            gameState.players.forEach(player => {
                row.insertCell().textContent = round.bids[player.name] !== undefined ? round.bids[player.name] : '-';
                row.insertCell().textContent = round.tricks[player.name] !== undefined ? round.tricks[player.name] : '-';
                row.insertCell().textContent = round.scoresChange[player.name] !== undefined ? round.scoresChange[player.name] : '-';
            });
        });

        fullSummaryTableContainer.appendChild(table);
    }

    // --- Export PDF ---
    exportPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'pt', 'a4');
        const margin = 40;
        let currentY = margin;

        // Titre
        pdf.setFontSize(20);
        pdf.text("Récapitulatif Partie d'Escalier", pdf.internal.pageSize.getWidth() / 2, currentY, { align: 'center' });
        currentY += 30;

        // Scores finaux (utilisation de autoTable pour un joli tableau)
        pdf.setFontSize(14);
        pdf.text("Scores Finaux", margin, currentY);
        currentY += 20;
        const finalScoresHeader = [['Joueur', 'Score Final', 'Contrats Réussis', 'Contrats Rompus']];
        const finalScoresBody = gameState.players.map(p => [p.name, p.score, p.contractsMade, p.contractsBroken]);
        pdf.autoTable({
            startY: currentY,
            head: finalScoresHeader,
            body: finalScoresBody,
            theme: 'striped',
            headStyles: { fillColor: [0, 123, 255] },
        });
        currentY = pdf.previousAutoTable.finalY + 30;

        // Graphiques (convertir canvas en image)
        pdf.text("Statistiques Graphiques", margin, currentY);
        currentY += 20;

        function addChartToPdf(chartCanvas, pdfDoc, yPos) {
            return new Promise((resolve) => {
                if (chartCanvas && chartCanvas.toDataURL) {
                    const imgData = chartCanvas.toDataURL('image/png');
                    const imgProps = pdfDoc.getImageProperties(imgData);
                    const pdfWidth = pdfDoc.internal.pageSize.getWidth() - 2 * margin;
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    pdfDoc.addImage(imgData, 'PNG', margin, yPos, pdfWidth, pdfHeight);
                    resolve(yPos + pdfHeight + 20);
                } else {
                    resolve(yPos); // Pas de canvas, on ne fait rien
                }
            });
        }

        addChartToPdf(document.getElementById('score-evolution-chart'), pdf, currentY)
        .then(newY => {
            currentY = newY;
            return addChartToPdf(document.getElementById('contracts-chart'), pdf, currentY);
        })
        .then(newY => {
            currentY = newY;
            if (currentY > pdf.internal.pageSize.getHeight() - margin*3) { // Check for new page
                 pdf.addPage();
                 currentY = margin;
            }

            // Tableau récapitulatif complet
            pdf.text("Tableau Récapitulatif Complet des Manches", margin, currentY);
            currentY += 20;
            const summaryHeader = [['Manche', 'Cartes', 'Donneur']];
            gameState.players.forEach(p => {
                summaryHeader[0].push(`${p.name} (Annonce)`);
                summaryHeader[0].push(`${p.name} (Fait)`);
                summaryHeader[0].push(`${p.name} (Score)`);
            });
            const summaryBody = gameState.roundHistory.map(r => {
                const rowData = [r.roundNum, r.cards, r.dealer];
                gameState.players.forEach(p => {
                    rowData.push(r.bids[p.name] !== undefined ? r.bids[p.name] : '-');
                    rowData.push(r.tricks[p.name] !== undefined ? r.tricks[p.name] : '-');
                    rowData.push(r.scoresChange[p.name] !== undefined ? r.scoresChange[p.name] : '-');
                });
                return rowData;
            });

            pdf.autoTable({
                startY: currentY,
                head: summaryHeader,
                body: summaryBody,
                theme: 'grid',
                headStyles: { fillColor: [0, 123, 255] },
                columnStyles: { // Pour que les colonnes de chiffres soient plus petites
                    // On pourrait cibler par index, mais c'est plus complexe si le nombre de joueurs varie
                }
            });

            pdf.save(`Escalier_Partie_${new Date().toISOString().slice(0,10)}.pdf`);
        });
    });


    // --- Initialisation au chargement de la page ---
    function checkExistingGame() {
        if (localStorage.getItem('escalierGameState')) {
            loadGameBtn.style.display = 'inline-block';
        } else {
            loadGameBtn.style.display = 'none';
        }
    }

    generatePlayerNameInputs(); // Pour avoir les inputs par défaut au chargement
    showScreen('setup-screen');
    checkExistingGame();

    // --- Gestion du thème clair/sombre ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Mode Clair';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Mode Sombre';
        }
    }

    // Charger le thème depuis le localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        const newTheme = isDarkMode ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    let setupTitleClicks = 0;
    let mainTitleClicks = 0;

    const setupTitle = document.getElementById('setup-title');
    const mainTitle = document.getElementById('main-title');

    setupTitle.addEventListener('click', () => {
        setupTitleClicks++;
        if (setupTitleClicks === 3 && mainTitleClicks === 2) {
            createTestGameBtn.style.display = 'inline-block';
        }
    });

    mainTitle.addEventListener('click', () => {
        mainTitleClicks++;
        if (setupTitleClicks === 3 && mainTitleClicks === 2) {
            createTestGameBtn.style.display = 'inline-block';
        }
    });

    createTestGameBtn.addEventListener('click', () => {
        // Remplir automatiquement les données pour une partie test
        gameState.numPlayers = 4;
        gameState.players = [
            { name: "Alice", score: 0, bidsHistory: [], tricksHistory: [], contractsMade: 0, contractsBroken: 0 },
            { name: "Bob", score: 0, bidsHistory: [], tricksHistory: [], contractsMade: 0, contractsBroken: 0 },
            { name: "Charlie", score: 0, bidsHistory: [], tricksHistory: [], contractsMade: 0, contractsBroken: 0 },
            { name: "Diana", score: 0, bidsHistory: [], tricksHistory: [], contractsMade: 0, contractsBroken: 0 }
        ];

        gameState.roundCardSequence = [1, 2, 3, 2, 1]; // Exemple de séquence de cartes
        gameState.totalRounds = gameState.roundCardSequence.length;
        gameState.currentRound = 0;
        gameState.currentDealerIndex = 0;
        gameState.currentPhase = 'bidding';
        gameState.roundHistory = [];

        saveGameState();
        startGameUI();

        // Afficher le bouton pour remplir automatiquement les scores
        autoFillScoresBtn.style.display = 'inline-block';
    });

    autoFillScoresBtn.addEventListener('click', () => {
        const currentCards = gameState.roundCardSequence[gameState.currentRound]; // Nombre max de cartes dans la manche

        if (gameState.currentPhase === 'bidding') {
            // Remplir automatiquement les annonces
            const bidInputs = document.querySelectorAll('#bids-inputs input[type="number"]');
            bidInputs.forEach((input) => {
                input.value = Math.floor(Math.random() * (currentCards + 1)); // Valeur aléatoire entre 0 et currentCards
                input.dispatchEvent(new Event('input')); // Mettre à jour le total
            });
        } else if (gameState.currentPhase === 'tricks') {
            // Remplir automatiquement les levées
            const trickInputs = document.querySelectorAll('#tricks-inputs input[type="number"]');
            trickInputs.forEach((input) => {
                input.value = Math.floor(Math.random() * (currentCards + 1)); // Valeur aléatoire entre 0 et currentCards
                input.dispatchEvent(new Event('input')); // Mettre à jour le total
            });
        }
    });
});