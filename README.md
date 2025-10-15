# Circus Daily Video Stats

A React dashboard for analyzing Circus Daily video performance compared to Sudinfo Sport videos.

## Features

- **Performance Comparison**: Compare key metrics between Circus Daily and Sudinfo Sport videos
- **Interactive Dashboard**: Multiple tabs for overview, completion analysis, evolution, and improvements
- **Data Visualization**: Charts showing viewer completion funnels, drop-off rates, and monthly trends
- **Excel File Upload**: Upload and analyze data from Excel files
- **Strategic Recommendations**: Actionable insights for improving video performance

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TomVdv187/CircusDailyVideoStats.git
cd CircusDailyVideoStats
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`.

### Usage

1. Upload your Sudinfo Excel file (first upload)
2. Upload your Circus Daily Excel file with "Raw data" sheet (second upload)
3. Navigate through the different tabs to analyze your data:
   - **Overview**: Key metrics and performance gaps
   - **Completion**: Viewer completion funnels and drop-off analysis
   - **Evolution**: Monthly performance trends
   - **Improvements**: Strategic recommendations

## Data Format

### Sudinfo File
- Should contain a column named "video" with video titles
- Videos are filtered for sport content using keywords

### Circus Daily File
- Must have a sheet named "Raw data"
- Should contain videos with catalogue="Circus Daily"
- Required columns: Streams, completion percentages, viewing time metrics

## Technology Stack

- React 18
- Recharts for data visualization
- Tailwind CSS for styling
- Lucide React for icons
- XLSX for Excel file processing
- Lodash for data manipulation

## License

MIT License