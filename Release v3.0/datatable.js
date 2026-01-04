let allData = [];
let filteredData = [];
let currentDateFilter = '';

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

async function loadData() {
        const response = await fetch('/api/dionice');
        const result = await response.json();
        
        if (result.status === "OK") {
            allData = result.response;
            filteredData = [...allData];
            displayData(filteredData);
            updateFilterStatus();
        } else {
            throw new Error(result.message);
        }

}
// Filtriranje po datumu 
function filterByDate() {
    const dateInput = document.getElementById('dateInput').value;
    
    if (!dateInput) {
        currentDateFilter = '';
        filteredData = [...allData];
    } else {
        currentDateFilter = dateInput;
        
        filteredData = allData.map(dionica => {
            const filteredDionica = { ...dionica };
            
            if (dionica.dnevne_promjene) {
                filteredDionica.dnevne_promjene = dionica.dnevne_promjene.filter(promjena => 
                    promjena.datum === dateInput
                );
            }
            
            return (filteredDionica.dnevne_promjene && filteredDionica.dnevne_promjene.length > 0) ? filteredDionica : null;
        }).filter(dionica => dionica !== null);
    }
    
    displayData(filteredData);
    filterByText()
    updateFilterStatus();
}

// Filtriranje po tekstu
function filterByText() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const attribute = document.getElementById('attributeSelect').value;
    
    let dataToFilter = currentDateFilter ? [...filteredData] : [...allData];
    
    if (!searchText) {
        if (currentDateFilter) {
            filterByDate();
        } else {
            filteredData = [...allData];
            displayData(filteredData);
        }
        updateFilterStatus();
        return;
    }
    
    filteredData = dataToFilter.filter(dionica => {
        if (attribute === 'svi') {
            return dionica.simbol.toLowerCase().includes(searchText) ||
                dionica.naziv_tvrtke.toLowerCase().includes(searchText);
        }
        else if (attribute === 'simbol') {
            return dionica.simbol.toLowerCase().includes(searchText);
        }
        else if (attribute === 'naziv_tvrtke') {
            return dionica.naziv_tvrtke.toLowerCase().includes(searchText);
        }
        return false;
    });
    
    displayData(filteredData);
    updateFilterStatus();
}

// Poništi filter datuma
function clearDateFilter() {
    document.getElementById('dateInput').value = '';
    currentDateFilter = '';
    filteredData = [...allData];
    displayData(filteredData);
    updateFilterStatus();
}

// Poništi filter teksta
function clearTextFilter() {
    document.getElementById('searchInput').value = '';
    document.getElementById('attributeSelect').value = 'svi';
    
    if (currentDateFilter) {
        filterByDate();
    } else {
        filteredData = [...allData];
        displayData(filteredData);
    }
    updateFilterStatus();
}

// Greška ako nema rezultat
function updateFilterStatus() {
    const statusElement = document.getElementById('filterStatus');
    
    if (filteredData.length === 0) {
        statusElement.textContent = 'Nema dostupnih podataka za tražene filtere';
        return;
    }
}

// Prikaži podatke 
function displayData(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" style="text-align: center;">Nema podataka za prikaz za odabrane filtere</td></tr>';
        return;
    }

    data.forEach(dionica => {
        if (dionica.dnevne_promjene && dionica.dnevne_promjene.length > 0) {
            dionica.dnevne_promjene.forEach(promjena => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dionica.simbol}</td>
                    <td>${dionica.naziv_tvrtke}</td>
                    <td>${dionica.sektor || '-'}</td>
                    <td>${promjena.datum}</td>
                    <td>${formatCurrency(promjena.cijena_otvaranja)}</td>
                    <td>${formatCurrency(promjena.cijena_zatvaranja)}</td>
                    <td>${formatCurrency(promjena.najvisa_cijena)}</td>
                    <td>${formatCurrency(promjena.najniza_cijena)}</td>
                    <td>${formatPercentage(promjena.postotak_promjene)}</td>
                    <td>${formatNumber(promjena.volumen)}</td>
                    <td>${formatMarketCap(dionica.trzisna_kapitalizacija)}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    });
}

// Dodaj znak dolar
function formatCurrency(value) {
    return '$' + parseFloat(value);
}

// Oboji postotak ovisno o poz/neg promjeni
function formatPercentage(value) {
    const number = parseFloat(value);
    
    if (number > 0) {
        return '<span style="color: green;">+' + number + '%</span>';
    } else if (number < 0) {
        return '<span style="color: red;">' + number + '%</span>';
    } else {
        return '<span>' + number + '%</span>';
    }
}

// Dodaj brojčane sufikse
function formatNumber(value) {
    const number = parseInt(value);
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
}

function formatMarketCap(value) {
    if (!value && value !== 0) return '-';
    const number = parseInt(value);
    if (number >= 1000000000000) {
        return '$' + (number / 1000000000000).toFixed(1) + 'T';
    } else if (number >= 1000000000) {
        return '$' + (number / 1000000000).toFixed(1) + 'B';
    } else if (number >= 1000000) {
        return '$' + (number / 1000000).toFixed(1) + 'M';
    }
    return '$' + number.toString();
}

// Funkcije za preuzimanje
function downloadFilteredCSV() {
    let csvContent = "Simbol dionice,Ime tvrtke,Sektor djelatnosti,Datum trgovanja,Cijena na početku dana,Cijena na kraju dana,Najviša cijena dana,Najniža cijena dana,Promjena cijene u postocima,Volumen trgovanja,Tržišna kapitalizacija (USD)\n";
    
    filteredData.forEach(dionica => {
        if (dionica.dnevne_promjene && dionica.dnevne_promjene.length > 0) {
            dionica.dnevne_promjene.forEach(promjena => {
                csvContent += `"${dionica.simbol}","${dionica.naziv_tvrtke}","${dionica.sektor || ''}","${promjena.datum}","${promjena.cijena_otvaranja || ''}","${promjena.cijena_zatvaranja || ''}","${promjena.najvisa_cijena || ''}","${promjena.najniza_cijena || ''}","${promjena.postotak_promjene || ''}","${promjena.volumen || ''}","${dionica.trzisna_kapitalizacija || ''}"\n`;
            });
        }
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dionice_${currentDateFilter || 'sve'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function downloadFilteredJSON() {
    const jsonContent = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dionice_${currentDateFilter || 'sve'}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
}



