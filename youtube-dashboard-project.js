// Configuration
const config = {
    apiKeys: [
        "AIzaSyCnjLUDZLiD8aGt-jC6XZcJ8AKyOwh15To",
        "AIzaSyBrzuJNlWT2KVMApzsKCDPdI059HLK8HVg",
          
    ],
    currentApiKeyIndex: 0,
    refreshInterval: 10000, // 10 seconds
    refreshTimer: null
};

// DOM Elements
const elements = {
    query: document.getElementById('query'),
    fromDate: document.getElementById('fromDate'),
    toDate: document.getElementById('toDate'),
    sortBy: document.getElementById('sortBy'),
    perPage: document.getElementById('perPage'),
    searchButton: document.getElementById('searchButton'),
    results: document.getElementById('results'),
    pagination: document.getElementById('pagination'),
    loading: document.getElementById('loading'),
    noResults: document.getElementById('noResults'),
    resultsCount: document.getElementById('resultsCount'),
    apiKey1: document.getElementById('apiKey1'),
    apiKey2: document.getElementById('apiKey2'),
    toggleRefresh: document.getElementById('toggleRefresh'),
    refreshInterval: document.getElementById('refreshInterval')
};

// State
const state = {
    currentPage: 1,
    totalResults: 0,
    nextPageToken: "",
    prevPageToken: "",
    lastSearchParams: null,
    isRefreshing: false
};

// Initialize the dashboard
function initDashboard() {
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
    
    elements.fromDate.value = oneMonthAgoStr;
    elements.toDate.value = today;
    
    // Event listeners
    elements.searchButton.addEventListener('click', handleSearch);
    elements.toggleRefresh.addEventListener('click', toggleAutoRefresh);
    elements.refreshInterval.addEventListener('change', updateRefreshInterval);
    
    // Load any saved API keys
    loadApiKeys();
    
    // Start with an initial search
    handleSearch();
}

// Handle search button click
function handleSearch() {
    state.currentPage = 1;
    const searchParams = getSearchParams();
    state.lastSearchParams = searchParams;
    
    fetchVideos(searchParams);
}

// Get current search parameters
function getSearchParams() {
    return {
        query: elements.query.value,
        fromDate: elements.fromDate.value,
        toDate: elements.toDate.value,
        sortBy: elements.sortBy.value,
        perPage: parseInt(elements.perPage.value),
        pageToken: ""
    };
}

// Fetch videos from YouTube API
async function fetchVideos(params, pageToken = "") {
    showLoading();
    
    try {
        // Format dates for API
        const publishedAfter = params.fromDate ? new Date(params.fromDate).toISOString() : "";
        const publishedBefore = params.toDate ? new Date(params.toDate).toISOString() : "";
        
        // Determine sort order
        const [sortField, sortOrder] = params.sortBy.split('_');
        let order = "date";
        if (sortField === "viewCount") order = "viewCount";
        if (sortField === "likeCount") order = "likeCount";
        
        // Build API URL
        let url = `https://www.googleapis.com/youtube/v3/search?` +
                 `key=${config.apiKeys[config.currentApiKeyIndex]}` +
                 `&part=snippet` +
                 `&type=video` +
                 `&maxResults=${params.perPage}` +
                 `&order=${order}`;
        
        if (params.query) url += `&q=${encodeURIComponent(params.query)}`;
        if (publishedAfter) url += `&publishedAfter=${publishedAfter}`;
        if (publishedBefore) url += `&publishedBefore=${publishedBefore}`;
        if (pageToken) url += `&pageToken=${pageToken}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            handleApiError(data.error);
            return;
        }
        
        // Update state
        state.nextPageToken = data.nextPageToken || "";
        state.prevPageToken = data.prevPageToken || "";
        state.totalResults = data.pageInfo?.totalResults || 0;
        
        // Fetch additional details for each video
        const videosWithDetails = await fetchVideoDetails(data.items);
        
        // Display results
        displayResults(videosWithDetails);
        updatePagination();
        
    } catch (error) {
        console.error("API Error:", error);
        showError("Failed to fetch videos. Please try again.");
    } finally {
        hideLoading();
    }
}

// Fetch additional video details (statistics, contentDetails)
async function fetchVideoDetails(videos) {
    if (!videos || videos.length === 0) return [];
    
    const videoIds = videos.map(video => video.id.videoId).join(',');
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?` +
            `key=${config.apiKeys[config.currentApiKeyIndex]}` +
            `&part=statistics,contentDetails` +
            `&id=${videoIds}`
        );
        
        const data = await response.json();
        
        if (data.error) {
            handleApiError(data.error);
            return videos; // Return original videos without details
        }
        
        // Combine the data
        return videos.map(video => {
            const details = data.items.find(item => item.id === video.id.videoId);
            return {
                ...video,
                statistics: details?.statistics || {},
                contentDetails: details?.contentDetails || {}
            };
        });
        
    } catch (error) {
        console.error("Error fetching video details:", error);
        return videos; // Return original videos if details fail
    }
}

// Display videos in the results grid
function displayResults(videos) {
    elements.results.innerHTML = '';
    elements.resultsCount.textContent = videos?.length || 0;
    
    if (!videos || videos.length === 0) {
        elements.noResults.classList.remove('hidden');
        return;
    }
    
    elements.noResults.classList.add('hidden');
    
    videos.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'bg-white rounded-lg shadow overflow-hidden';
        
        const likeCount = video.statistics?.likeCount ? formatNumber(video.statistics.likeCount) : 'N/A';
        const viewCount = video.statistics?.viewCount ? formatNumber(video.statistics.viewCount) : 'N/A';
        const duration = video.contentDetails?.duration ? formatDuration(video.contentDetails.duration) : 'N/A';
        
        videoCard.innerHTML = `
            <div class="flex flex-col md:flex-row">
                <div class="md:w-1/3 relative">
                    <img src="${video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url}" 
                         alt="${video.snippet.title}" 
                         class="w-full h-full object-cover">
                    <div class="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                        ${duration}
                    </div>
                </div>
                <div class="md:w-2/3 p-4">
                    <h3 class="font-bold text-lg mb-2 line-clamp-2">${video.snippet.title}</h3>
                    <p class="text-gray-600 text-sm mb-3">${video.snippet.channelTitle}</p>
                    <div class="flex flex-wrap gap-4 text-sm">
                        <span class="flex items-center text-gray-700">
                            <i class="fas fa-eye mr-1"></i> ${viewCount} views
                        </span>
                        <span class="flex items-center text-gray-700">
                            <i class="fas fa-thumbs-up mr-1"></i> ${likeCount} likes
                        </span>
                    </div>
                    <div class="mt-3 text-xs text-gray-500">
                        <i class="far fa-clock mr-1"></i> Published: ${formatDate(video.snippet.publishedAt)}
                    </div>
                    <a href="https://www.youtube.com/watch?v=${video.id.videoId}" 
                       target="_blank" 
                       class="mt-3 inline-block text-red-600 hover:text-red-800 text-sm font-medium">
                        Watch on YouTube <i class="fas fa-external-link-alt ml-1"></i>
                    </a>
                </div>
            </div>
        `;
        
        elements.results.appendChild(videoCard);
    });
}

// Update pagination controls
function updatePagination() {
    elements.pagination.innerHTML = '';
    
    if (state.totalResults <= parseInt(elements.perPage.value)) {
        return;
    }
    
    const totalPages = Math.ceil(state.totalResults / parseInt(elements.perPage.value));
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left mr-1"></i> Previous';
    prevButton.className = 'px-4 py-2 bg-gray-200 rounded-l hover:bg-gray-300 disabled:opacity-50';
    prevButton.disabled = state.currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (state.prevPageToken) {
            state.currentPage--;
            fetchVideos(state.lastSearchParams, state.prevPageToken);
        }
    });
    elements.pagination.appendChild(prevButton);
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'px-4 py-2 bg-white border-t border-b border-gray-300';
    pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
    elements.pagination.appendChild(pageInfo);
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = 'Next <i class="fas fa-chevron-right ml-1"></i>';
    nextButton.className = 'px-4 py-2 bg-gray-200 rounded-r hover:bg-gray-300 disabled:opacity-50';
    nextButton.disabled = !state.nextPageToken || state.currentPage >= totalPages;
    nextButton.addEventListener('click', () => {
        if (state.nextPageToken) {
            state.currentPage++;
            fetchVideos(state.lastSearchParams, state.nextPageToken);
        }
    });
    elements.pagination.appendChild(nextButton);
}

// Handle API errors
function handleApiError(error) {
    console.error("YouTube API Error:", error);
    
    if (error.code === 403 && error.message.includes("quota")) {
        // Quota exceeded - try next API key if available
        if (config.currentApiKeyIndex < config.apiKeys.length - 1) {
            config.currentApiKeyIndex++;
            console.log("Switching to backup API key");
            fetchVideos(state.lastSearchParams, state.nextPageToken || state.prevPageToken);
            return;
        }
        showError("API quota exceeded. Please try again later or add more API keys.");
    } else {
        showError(error.message || "An API error occurred");
    }
}

// Toggle auto-refresh
function toggleAutoRefresh() {
    if (config.refreshTimer) {
        clearInterval(config.refreshTimer);
        config.refreshTimer = null;
        elements.toggleRefresh.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        startAutoRefresh();
        elements.toggleRefresh.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

// Start auto-refresh
function startAutoRefresh() {
    if (config.refreshTimer) {
        clearInterval(config.refreshTimer);
    }
    
    config.refreshTimer = setInterval(() => {
        if (state.lastSearchParams && !state.isRefreshing) {
            state.isRefreshing = true;
            fetchVideos(state.lastSearchParams)
                .finally(() => state.isRefreshing = false);
        }
    }, config.refreshInterval);
    
    elements.toggleRefresh.innerHTML = '<i class="fas fa-pause"></i>';
}

// Update refresh interval
function updateRefreshInterval() {
    config.refreshInterval = parseInt(elements.refreshInterval.value) * 1000;
    if (config.refreshTimer) {
        startAutoRefresh();
    }
}

// Load saved API keys from localStorage
function loadApiKeys() {
    const savedKey2 = localStorage.getItem('youtube_api_key_2');
    if (savedKey2) {
        elements.apiKey2.value = savedKey2;
        config.apiKeys[1] = savedKey2;
    }
    
    elements.apiKey2.addEventListener('change', () => {
        const newKey = elements.apiKey2.value.trim();
        if (newKey) {
            config.apiKeys[1] = newKey;
            localStorage.setItem('youtube_api_key_2', newKey);
        }
    });
}

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(num) {
    return parseInt(num).toLocaleString();
}

function formatDuration(duration) {
    // ISO 8601 duration format (PT1H23M45S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    return [
        hours ? hours.toString().padStart(2, '0') : null,
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
}

function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.results.classList.add('hidden');
}

function hideLoading() {
    elements.loading.classList.add('hidden');
    elements.results.classList.remove('hidden');
}

function showError(message) {
    elements.noResults.innerHTML = `
        <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-700">Error</h3>
        <p class="text-gray-600">${message}</p>
    `;
    elements.noResults.classList.remove('hidden');
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);