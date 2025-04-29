const coinsList = document.getElementById('coins-list');
const exchangesList = document.getElementById('exchanges-list');
const nftsList = document.getElementById('nfts-list');

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('query');

    if (query) {
        fetchSearchResult(query, ['coins-list', 'exchanges-list', 'nfts-list']);
    } else {
        const searchHeading = document.getElementById('searchHeading');
        const searchContainer = document.querySelector('.search-container');
        searchContainer.innerHTML = '<p style="color: red; text-align: center; margin-bottom: 8px">Nothing To Show...</p>';
        searchHeading.innerText = 'Please search something...';
    }
});

function fetchSearchResult(param, elementIds) {
    const searchHeading = document.getElementById('searchHeading');
    searchHeading.innerText = `Searching for "${param}"...`;

    elementIds.forEach(id => {
        const errorElement = document.getElementById(`${id}-error`);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        toggleSpinner(id, `${id}-spinner`, true);
    });

    coinsList.innerHTML = '';
    exchangesList.innerHTML = '';
    nftsList.innerHTML = '';

    const url = `https://api.coingecko.com/api/v3/search?query=${param}`;
    const options = { method: 'GET', headers: { accept: 'application/json' } };

    fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            elementIds.forEach(id => toggleSpinner(id, `${id}-spinner`, false));

            let coins = (data.coins || []).filter(coin => coin.thumb !== "missing_thumb.png");
            let exchanges = (data.exchanges || []).filter(ex => ex.thumb !== "missing_thumb.png");
            let nfts = (data.nfts || []).filter(nf => nf.thumb !== "missing_thumb.png");

            const coinsCount = coins.length;
            const exchangesCount = exchanges.length;
            const nftsCount = nfts.length;

            let minCount = Math.min(coinsCount, exchangesCount, nftsCount);

            if (coinsCount > 0 && exchangesCount > 0 && nftsCount > 0) {
                coins = coins.slice(0, minCount);
                exchanges = exchanges.slice(0, minCount);
                nfts = nfts.slice(0, minCount);
            }

            coinsResult(coins);
            if (typeof exchangesResult === 'function') {
                exchangesResult(exchanges);
            }
            nftsResult(nfts);

            if (coins.length === 0) {
                coinsList.innerHTML = '<p style="color: red; text-align: center;">No results found for coins.</p>';
            }
            if (exchanges.length === 0) {
                exchangesList.innerHTML = '<p style="color: red; text-align: center;">No results found for exchanges.</p>';
            }
            if (nfts.length === 0) {
                nftsList.innerHTML = '<p style="color: red; text-align: center;">No results found for nfts.</p>';
            }

            searchHeading.innerText = `Search results for "${param}"`;
        })
        .catch(error => {
            elementIds.forEach(id => {
                toggleSpinner(id, `${id}-spinner`, false);
                const errorElement = document.getElementById(`${id}-error`);
                if (errorElement) {
                    errorElement.style.display = 'block';
                }
            });
            console.error('Error fetching data:', error);
        });
}

function coinsResult(coins) {
    coinsList.innerHTML = '';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Rank</th>
                <th>Coin</th>
            </tr>
        </thead>
    `;

    const tbody = document.createElement('tbody');
    coins.forEach(coin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${coin.market_cap_rank ?? '-'}</td>
            <td class="name-column">
                <img src="${coin.thumb}" alt="${coin.name}" /> ${coin.name} <span>(${coin.symbol.toUpperCase()})</span>
            </td>
        `;
        if (coin.id) {
            row.onclick = () => {
                window.location.href = `coin.html?coin=${coin.id}`;
            };
            row.style.cursor = 'pointer';
        }
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    coinsList.appendChild(table);
}

// Set up search container
const searchWrapper = document.querySelector('.search');
searchWrapper.style.position = 'relative'; // Make parent relative

// Create suggestions box
const suggestionsBox = document.createElement('div');
suggestionsBox.className = 'suggestions-box';
suggestionsBox.style.position = 'absolute';
suggestionsBox.style.top = '100%';
suggestionsBox.style.left = '0';
suggestionsBox.style.width = '100%';
suggestionsBox.style.background = '#fff';
suggestionsBox.style.border = '1px solid #ccc';
suggestionsBox.style.borderTop = 'none'; // Remove top border to look connected
suggestionsBox.style.maxHeight = '200px';
suggestionsBox.style.overflowY = 'auto';
suggestionsBox.style.zIndex = '1000';
suggestionsBox.style.display = 'none';
suggestionsBox.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
suggestionsBox.style.marginTop = '2px'; // Small gap

searchWrapper.appendChild(suggestionsBox);

let suggestionTimeout;

document.getElementById('searchInput').addEventListener('input', function () {
    const query = this.value.trim();
    clearTimeout(suggestionTimeout);

    if (query.length === 0) {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
        return;
    }

    suggestionTimeout = setTimeout(() => {
        fetch(`https://api.coingecko.com/api/v3/search?query=${query}`)
            .then(response => response.json())
            .then(data => {
                const coins = (data.coins || []).slice(0, 5);
                showSuggestions(coins);
            })
            .catch(error => {
                console.error('Error fetching suggestions:', error);
            });
    }, 300); // 300ms debounce
});

function showSuggestions(coins) {
    suggestionsBox.innerHTML = '';

    if (coins.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    coins.forEach(coin => {
        const item = document.createElement('div');
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.transition = 'background 0.2s';

        item.innerHTML = `
            <img src="${coin.thumb}" alt="${coin.name}" width="20" height="20">
            <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
        `;

        // Hover effect
        item.addEventListener('mouseover', () => {
            item.style.background = '#f1f1f1';
        });
        item.addEventListener('mouseout', () => {
            item.style.background = 'transparent';
        });

        // Click to navigate
        item.addEventListener('click', () => {
            window.location.href = `coin.html?coin=${coin.id}`;
        });

        suggestionsBox.appendChild(item);
    });

    suggestionsBox.style.display = 'block';
}

// Hide suggestions when clicking outside
document.addEventListener('click', function (e) {
    if (!searchWrapper.contains(e.target)) {
        suggestionsBox.style.display = 'none';
    }
});
