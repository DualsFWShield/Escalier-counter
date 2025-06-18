# Escalier Counter

Escalier Counter is a web-based application designed to manage and track scores for the card game "Escalier." It provides an intuitive interface for players to input bids, track tricks, and calculate scores automatically. The app also includes features like dark mode, game state saving, and PDF export for game summaries.

## Features

- **Dynamic Player Setup**: Supports 4 to 6 players with customizable names.
- **Score Tracking**: Automatically calculates scores based on bids and tricks.
- **Dark Mode**: Toggle between light and dark themes.
- **Game State Persistence**: Save and resume games using local storage.
- **PDF Export**: Generate a detailed game summary in PDF format.
- **Charts**: Visualize score evolution and contract performance using charts.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/escalier-counter.git
   ```
2. Navigate to the project directory:
   ```bash
   cd escalier-counter
   ```
3. Open `index.html` in your browser to start the application.

## Usage

1. **Setup**:
   - Select the number of players (4-6).
   - Enter player names.
   - Click "Commencer" to start the game.

2. **Gameplay**:
   - Input bids during the bidding phase.
   - Input tricks during the tricks phase.
   - Scores are calculated automatically after each round.

3. **End Game**:
   - View the final scores and charts.
   - Export the game summary as a PDF.

4. **Dark Mode**:
   - Use the "Mode Sombre" button to toggle between light and dark themes.

## Development

### Prerequisites

- A modern web browser (e.g., Chrome, Firefox).
- Basic knowledge of HTML, CSS, and JavaScript for customization.

### File Structure

- `index.html`: Main HTML file.
- `style.css`: Styles for the application.
- `script.js`: JavaScript logic for the game.
- `readme.md`: Project documentation.

### Libraries Used

- [Chart.js](https://www.chartjs.org/): For creating charts.
- [jsPDF](https://github.com/parallax/jsPDF): For generating PDF exports.
- [Font Awesome](https://fontawesome.com/): For icons.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve the project.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgments

- Inspired by the card game "Escalier."
- Special thanks to the developers of the libraries used in this project.
