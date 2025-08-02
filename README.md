# YouTube Video Dashboard - README

## Overview

This YouTube Video Dashboard is a web application that allows users to search for YouTube videos using various filters and display results in a clean, responsive interface. The application features API key management, pagination, auto-refresh functionality, and detailed video information display.

(<img width="1917" height="1077" alt="image" src="https://github.com/user-attachments/assets/965c5fcc-e439-4e35-9226-0358e3eb4b29" />)

## Features

- Search YouTube videos by keyword
- Filter by date range
- Sort by newest/oldest, views, or likes
- Paginated results
- Auto-refresh functionality
- API key management with automatic failover
- Detailed video information including:
  - Thumbnails
  - View counts
  - Like counts
  - Video duration
  - Publication date

## Setup Instructions

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- YouTube API keys (get from Google Cloud Console)

### Installation

1. Save the HTML file as `index.html`
2. Save the JavaScript file as `youtube-dashboard-project.js`
3. Open `index.html` in your web browser

### API Key Configuration

1. Open the JavaScript file (`youtube-dashboard-project.js`)
2. Locate the config section at the top
3. Replace the placeholder API keys with your own:

```javascript
const config = {
    apiKeys: [
        "YOUR_FIRST_API_KEY",
        "YOUR_SECOND_API_KEY"
    ],
    // ... rest of the config
};
```

## Usage

1. Enter a search term in the "Search Query" field
2. (Optional) Set date range using the date pickers
3. Select sorting preference and results per page
4. Click "Search Videos" button
5. Results will appear in the main content area
6. Use pagination controls to navigate through results

## Auto-Refresh

- To enable auto-refresh, click the circular refresh button
- Use the dropdown to select refresh interval (5s, 10s, 30s, 60s)
- Click the button again to disable auto-refresh

## API Key Management

- Primary key is set in the JavaScript configuration
- Enter a secondary API key in the "Secondary Key" field
- The application will automatically switch to the secondary key if the primary key's quota is exceeded

## Technical Details

- **Frontend:** HTML, CSS (Tailwind), JavaScript
- **APIs Used:** YouTube Data API v3
- **Error Handling:** Automatic API key rotation when quota is exceeded
- **Persistence:** Secondary API key saved in localStorage
- **Responsive Design:** Works on mobile, tablet, and desktop

## Troubleshooting

- **No results appearing:**
  - Check your API keys
  - Verify you have sufficient quota in Google Cloud Console
  - Ensure your search term is valid

- **API quota exceeded:**
  - Add more API keys to the configuration
  - Wait for quota to reset (daily)

- **Auto-refresh not working:**
  - Make sure you've clicked the refresh button to enable it
  - Check that you have an active search
