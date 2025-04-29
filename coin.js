const widgetConfig1 = {
    "symbol": "BINANCE:BTCUSDT",
    "width": "100%",
    "isTransparent": true,
    "colorTheme": "dark",
    "locale": "en"
};

const widgetConfig2 = {
    "symbols": [
        ["BINANCE:BTCUSDT|1D"]
    ],
    "chartOnly": false,
    "width": "100%",
    "height": "100%",
    "locale": "en",
    "colorTheme": "dark",
    "autosize": true,
    "showVolume": false,
    "showMA": false,
    "hideDateRanges": false,
    "hideMarketStatus": false,
    "hideSymbolLogo": true,
    "scalePosition": "right",
    "scaleMode": "Normal",
    "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
    "fontSize": "10",
    "noTimeScale": false,
    "valuesTracking": "1",
    "changeMode": "price-and-percent",
    "chartType": "area",
    "maLineColor": "#2962FF",
    "maLineWidth": 1,
    "maLength": 9,
    "headerFontSize": "medium",
    "backgroundColor": "rgba(14, 18, 24, 1)",
    "gridLineColor": "rgba(76, 175, 80, 0.06)",
    "lineWidth": 2,
    "lineType": 0,
    "dateRanges": [
        "1d|15",
        "1m|30",
        "3m|60",
        "12m|1D",
        "60m|1W",
        "all|1M"
    ],
    "dateFormat": "yyyy-MM-dd"
};

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('coin');

    if (query) {
        fetchCoinInfo(query);
    } else {
        window.location.href = "/../../index.html";
    }
});

async function fetchCoinInfo(query) {
    const coinInfoError = document.getElementById('coin-info-error');
    coinInfoError.style.display = 'none';
    const apiUrl = `https://api.coingecko.com/api/v3/coins/${query}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();

        const baseSymbol = data.symbol?.toUpperCase() || '';
        let tradingViewSymbol = null;

        if (data.tickers && data.tickers.length > 0) {
            const binanceTicker = data.tickers.find(
                ticker => ticker.market.identifier === 'binance' && ticker.target === 'USDT'
            );
            if (binanceTicker) {
                tradingViewSymbol = `BINANCE:${binanceTicker.base}${binanceTicker.target}`;
            }
        }

        if (!tradingViewSymbol) {
            // Nếu không tìm được trên Binance USDT, **không fallback linh tinh** (để tránh hiện Apple)
            throw new Error('No valid Binance USDT trading pair found for this coin.');
        }

        console.log("Using TradingView symbol:", tradingViewSymbol);

        widgetConfig1.symbol = tradingViewSymbol;
        widgetConfig2.symbols = [
            [`${tradingViewSymbol}|1D`]
        ];

        initializeWidget(true);
        displayCoinInfo(data);
    } catch (error) {
        console.error('Error fetching coin info:', error);
        coinInfoError.textContent = error.message || 'Failed to fetch coin information';
        coinInfoError.style.display = 'flex';
    }
}


function initializeWidget(forceReload = false) {
    try {
        const themeConfig = getThemeConfig();

        // Update widget themes
        widgetConfig1.colorTheme = themeConfig.theme;
        widgetConfig2.colorTheme = themeConfig.theme;
        widgetConfig2.backgroundColor = themeConfig.backgroundColor;
        widgetConfig2.gridLineColor = themeConfig.gridColor;

        if (forceReload) {
            // Clear existing widgets first
            const tickerWidget = document.getElementById('ticker-widget');
            const chartWidget = document.getElementById('mini-chart-widget');
            if (tickerWidget) tickerWidget.innerHTML = '';
            if (chartWidget) chartWidget.innerHTML = '';
        }

        // Create widgets with updated symbols
        createWidget('ticker-widget', widgetConfig1,
            'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js');

        createWidget('mini-chart-widget', widgetConfig2,
            'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js');

    } catch (error) {
        console.error('Error initializing widgets:', error);
    }
}

function displayCoinInfo(coin) {
    try {
        const coinInfo = document.querySelector('.coin-info');
        const rightSec = document.querySelector('.coin-container .right-section');
        const coinDesc = document.getElementById('coin-desc-p');

        if (!coinInfo || !rightSec || !coinDesc) {
            throw new Error('Required DOM elements not found');
        }

        // Safely access nested properties with null checks
        const imageSrc = coin.image?.thumb || 'https://via.placeholder.com/20';
        const symbol = coin.symbol?.toUpperCase() || '';
        const marketCapRank = coin.market_cap_rank || '-';

        coinInfo.innerHTML = `
            <div class="logo">
                <img src="${imageSrc}" alt="${coin.name}" onerror="this.src='https://via.placeholder.com/20'">
                <h4>${coin.name} <span>(${symbol})</span></h4>
                <p>#${marketCapRank}</p>
            </div>
            <div class="status">
                ${createInfoItem('Market Cap', coin.market_data?.market_cap?.usd)}
                ${createInfoItem('Current Price', coin.market_data?.current_price?.usd)}
                ${createInfoItem('All Time High', coin.market_data?.ath?.usd)}
                ${createInfoItem('All Time Low', coin.market_data?.atl?.usd)}
                ${createInfoItem('Total Volume', coin.market_data?.total_volume?.usd)}
                ${createInfoItem('Total Supply', coin.market_data?.total_supply)}
                ${createInfoItem('Max Supply', coin.market_data?.max_supply)}
                ${createInfoItem('Circulating Supply', coin.market_data?.circulating_supply)}
            </div>
        `;

        rightSec.innerHTML = `
            <div class="status">
                <h3>Historical Info</h3>
                <div class="container">
                    ${createInfoItem('ATH', coin.market_data?.ath?.usd)}
                    ${createInfoItem('ATL', coin.market_data?.atl?.usd)}
                    ${createInfoItem('24h High', coin.market_data?.high_24h?.usd)}
                    ${createInfoItem('24h Low', coin.market_data?.low_24h?.usd)}
                </div>
            </div>
            ${createMarketsSection(coin)}
            ${createLinksSection(coin)}
        `;

        coinDesc.innerHTML = coin.description?.en || '<p class="red">Asset description not available!</p>';
    } catch (error) {
        console.error('Error displaying coin info:', error);
    }
}

function createInfoItem(label, value) {
    const formattedValue = value != null
        ? (typeof value === 'number'
            ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : value)
        : "N/A";

    return `
        <div class="item">
            <p class="str">${label}</p>
            <p class="num">${formattedValue}</p>
        </div>
    `;
}

function createMarketsSection(coin) {
    if (!coin.tickers || coin.tickers.length === 0) return '';

    const tickersToShow = coin.tickers.slice(0, 3);

    return `
        <div class="status">
            <h3>Markets</h3>
            <div class="container">
                ${tickersToShow.map(ticker => `
                    <div class="item">
                        <p class="str">${ticker.market?.name?.replace('Exchange', '') || 'Unknown'}</p>
                        <div class="links">
                            ${ticker.trade_url ? `<a href="${ticker.trade_url}" target="_blank">Trade</a>` : ''}
                            <p style="background-color: ${ticker.trust_score || 'gray'}">Trusted?</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function createLinksSection(coin) {
    return `
        <div class="status">
            <h3>Info</h3>
            <div class="container">
                <div class="item">
                    <p class="str">Website</p>
                    <div class="links">
                        ${coin.links?.homepage?.[0] ? `<a target="_blank" href="${coin.links.homepage[0]}">Visit</a>` : ''}
                        ${coin.links?.whitepaper ? `<a target="_blank" href="${coin.links.whitepaper}">Whitepaper</a>` : ''}
                    </div>
                </div>
                <div class="item">
                    <p class="str">Community</p>
                    <div class="links">
                        ${coin.links?.twitter_screen_name ? `<a target="_blank" href="https://x.com/${coin.links.twitter_screen_name}">Twitter</a>` : ''}
                        ${coin.links?.facebook_username ? `<a target="_blank" href="https://facebook.com/${coin.links.facebook_username}">Facebook</a>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getThemeConfig() {
    try {
        const root = getComputedStyle(document.documentElement);
        const isDarkTheme = localStorage.getItem('theme') !== 'light-theme';

        return {
            theme: isDarkTheme ? 'dark' : 'light',
            backgroundColor: root.getPropertyValue(isDarkTheme ? '--chart-dark-bg' : '--chart-light-bg').trim(),
            gridColor: root.getPropertyValue(isDarkTheme ? '--chart-dark-border' : '--chart-light-border').trim()
        };
    } catch (error) {
        console.error('Error getting theme config:', error);
        return {
            theme: 'dark',
            backgroundColor: 'rgba(14, 18, 24, 1)',
            gridColor: 'rgba(76, 175, 80, 0.06)'
        };
    }
}