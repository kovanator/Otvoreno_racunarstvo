const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'OtvRac_lab',
    password: 'bazepodataka',
    port: 5432,
});

app.use(express.static('.')); 

app.get('/api/dionice', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                d.simbol,
                d.naziv_tvrtke,
                d.sektor,
                d.trzisna_kapitalizacija,
                json_agg(
                    json_build_object(
                        'datum', dp.datum,
                        'cijena_otvaranja', dp.cijena_otvaranja,
                        'cijena_zatvaranja', dp.cijena_zatvaranja,
                        'najvisa_cijena', dp.najvisa_cijena,
                        'najniza_cijena', dp.najniza_cijena,
                        'postotak_promjene', dp.postotak_promjene,
                        'volumen', dp.volumen
                    ) ORDER BY dp.datum DESC
                ) as dnevne_promjene
            FROM dionice d
            LEFT JOIN dnevne_promjene dp ON d.simbol = dp.simbol
            GROUP BY d.simbol, d.naziv_tvrtke, d.sektor, d.trzisna_kapitalizacija
            ORDER BY d.trzisna_kapitalizacija DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Greška:', error);
        res.status(500).json({ error: 'Greška pri dohvatu podataka' });
    }
});


app.listen(port, () => {
    console.log(`Server pokrenut na http://localhost:${port}`);
});