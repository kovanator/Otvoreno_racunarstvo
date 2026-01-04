const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

// Spajanje s bazom
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'OtvRac_lab',
    password: 'bazepodataka',
    port: 5432,
});

// Middleware
app.use(express.json());
app.use(express.static('.')); 

function responseWrapper(response, status = "OK", message = "") {
    return {
        status: status,
        message: message,
        response: response
    };
}

app.get('/api/openapi', (req, res) => {
    res.json(require('./openapi.json'));
});

app.listen(port, () => {
    console.log(`Server pokrenut na http://localhost:${port}`);
});

// Dohvat svih dionica 

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
        
        if(result.rows.length === 0) {
            return res.status(404).json(responseWrapper(
                null, 
                "Not found", 
                "Nema dostupnih dionica"));
        }

        res.status(200).json(responseWrapper(
            result.rows,
            "OK",
            "Dionice uspješno dohvaćene"
        ));

    } catch (error) {
        console.error('Greška pri dohvatu dionica : ', error);
        res.status(500).json(responseWrapper(
            null, 
            "Pogreska na serveru", 
            "Došlo je do greške pri dohvaćanju dionica"
        ));
    }
});

// Dodavanje nove dionice

app.post('/api/dionice', async (req, res) => {
    try {
        const { simbol, naziv_tvrtke, sektor, trzisna_kapitalizacija } = req.body;  

        if(!simbol || !naziv_tvrtke || !sektor ) {
            return res.status(400).json(responseWrapper(
                null, 
                "Bad Request", 
                "Nedostaju obavezna polja: simbol, naziv_tvrtke ili sektor"
            ));
        }

        const checkResult = await pool.query(
            'SELECT * FROM dionice WHERE simbol = $1', 
            [simbol]
        );

        if(checkResult.rows.length > 0) {
            return res.status(409).json(responseWrapper(
                null, 
                "Conflict", 
                `Dionica sa simbolom ${simbol} već postoji`
            ));
        }

        const insertResult = await pool.query(
            'INSERT INTO dionice (simbol, naziv_tvrtke, sektor, trzisna_kapitalizacija) VALUES ($1, $2, $3, $4) RETURNING *',
            [simbol, naziv_tvrtke, sektor, trzisna_kapitalizacija || null]
        );

        const novaDionica = {
            ...insertResult.rows[0],
            dnevne_promjene: []
        }

        res.status(201).json(responseWrapper(
            novaDionica,
            "Created",
            "Dionica uspješno dodana"
        ));

    } catch (error) {
        console.error('Greška pri dodavanju dionice: ', error);
        res.status(500).json(responseWrapper(   
            null,
            "Pogreska na serveru",
            "Došlo je do greške pri dodavanju dionice"
        ));
    }

});

// Dohvat dionice po simbolu

app.get('/api/dionice/:simbol', async (req, res) => {
    try {
        const { simbol } = req.params;
        
        const result = await pool.query(`
            SELECT 
                d.simbol,
                d.naziv_tvrtke,
                d.sektor,
                d.trzisna_kapitalizacija,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'simbol', dp.simbol,
                            'datum', dp.datum,
                            'cijena_otvaranja', dp.cijena_otvaranja,
                            'cijena_zatvaranja', dp.cijena_zatvaranja,
                            'najvisa_cijena', dp.najvisa_cijena,
                            'najniza_cijena', dp.najniza_cijena,
                            'postotak_promjene', dp.postotak_promjene,
                            'volumen', dp.volumen
                        ) ORDER BY dp.datum DESC
                    ) FILTER (WHERE dp.simbol IS NOT NULL),
                    '[]'::json
                ) as dnevne_promjene
            FROM dionice d
            LEFT JOIN dnevne_promjene dp ON d.simbol = dp.simbol
            WHERE d.simbol = $1
            GROUP BY d.simbol, d.naziv_tvrtke, d.sektor, d.trzisna_kapitalizacija
        `, [simbol]);
        
        if (result.rows.length === 0) {
            return res.status(404).json(responseWrapper(
                null,
                "Not Found",
                `Dionica sa simbolom '${simbol}' ne postoji`
            ));
        }
        
        res.status(200).json(responseWrapper(
            result.rows[0],
            "OK",
            `Dionica '${simbol}' uspješno dohvaćena`
        ));

    } catch (error) {
        console.error('Greška pri dohvatu dionice:', error);
        res.status(500).json(responseWrapper(
            null,
            "Internal Server Error",
            "Greška pri dohvatu podataka o dionici"
        ));
    }
});


// Azuriranje dionice

app.put('/api/dionice/:simbol', async (req, res) => {
    try {
        const { simbol } = req.params;
        const { naziv_tvrtke, sektor, trzisna_kapitalizacija } = req.body;
        
        // Provjera postoji li dionica
        const checkResult = await pool.query(
            'SELECT simbol FROM dionice WHERE simbol = $1',
            [simbol]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json(responseWrapper(
                null,
                "Not Found",
                `Dionica sa simbolom '${simbol}' ne postoji`
            ));
        }
        
        // Priprema update query
        const updateFields = [];
        const values = [];
        let paramCounter = 1;
        
        if (naziv_tvrtke !== undefined) {
            updateFields.push(`naziv_tvrtke = $${paramCounter}`);
            values.push(naziv_tvrtke);
            paramCounter++;
        }
        
        if (sektor !== undefined) {
            updateFields.push(`sektor = $${paramCounter}`);
            values.push(sektor);
            paramCounter++;
        }
        
        if (trzisna_kapitalizacija !== undefined) {
            updateFields.push(`trzisna_kapitalizacija = $${paramCounter}`);
            values.push(trzisna_kapitalizacija);
            paramCounter++;
        }
        
        // Ako nema polja za ažuriranje
        if (updateFields.length === 0) {
            return res.status(400).json(responseWrapper(
                null,
                "Bad Request",
                "Nema podataka za ažuriranje"
            ));
        }
        
        values.push(simbol);
        
        // Izvrši update
        await pool.query(
            `UPDATE dionice 
                SET ${updateFields.join(', ')} 
                WHERE simbol = $${paramCounter}`,
            values
        );
        
        // Dohvati ažuriranu dionicu
        const updatedResult = await pool.query(`
            SELECT 
                d.simbol,
                d.naziv_tvrtke,
                d.sektor,
                d.trzisna_kapitalizacija,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'simbol', dp.simbol,
                            'datum', dp.datum,
                            'cijena_otvaranja', dp.cijena_otvaranja,
                            'cijena_zatvaranja', dp.cijena_zatvaranja,
                            'najvisa_cijena', dp.najvisa_cijena,
                            'najniza_cijena', dp.najniza_cijena,
                            'postotak_promjene', dp.postotak_promjene,
                            'volumen', dp.volumen
                        ) ORDER BY dp.datum DESC
                    ) FILTER (WHERE dp.simbol IS NOT NULL),
                    '[]'::json
                ) as dnevne_promjene
            FROM dionice d
            LEFT JOIN dnevne_promjene dp ON d.simbol = dp.simbol
            WHERE d.simbol = $1
            GROUP BY d.simbol, d.naziv_tvrtke, d.sektor, d.trzisna_kapitalizacija
        `, [simbol]);
        
        res.status(200).json(responseWrapper(
            updatedResult.rows[0],
            "OK",
            `Dionica '${simbol}' uspješno ažurirana`
        ));
    } catch (error) {
        console.error('Greška pri ažuriranju dionice:', error);
        res.status(500).json(responseWrapper(
            null,
            "Internal Server Error",
            "Greška pri ažuriranju dionice"
        ));
    }
});


// Brisanje dionice

app.delete('/api/dionice/:simbol', async (req, res) => {
    try {
        const { simbol } = req.params;
        
        // Provjera postoji li dionica
        const checkResult = await pool.query(
            'SELECT simbol FROM dionice WHERE simbol = $1',
            [simbol]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json(responseWrapper(
                null,
                "Not Found",
                `Dionica sa simbolom '${simbol}' ne postoji`
            ));
        }
        
        // Obriši dnevne promjene 
        await pool.query('DELETE FROM dnevne_promjene WHERE simbol = $1', [simbol]);
        
        // Obriši dionicu
        await pool.query('DELETE FROM dionice WHERE simbol = $1', [simbol]);
        
        res.status(200).json(responseWrapper(
            null,
            "OK",
            `Dionica '${simbol}' uspješno obrisana`
        ));

    } catch (error) {
        console.error('Greška pri brisanju dionice:', error);
        res.status(500).json(responseWrapper(
            null,
            "Internal Server Error",
            "Greška pri brisanju dionice"
        ));
    }
});

// Dohvat dionica po sektoru

app.get('/api/dionice/sektor/:sektor', async (req, res) => {
    try {
        const { sektor } = req.params;
        
        const result = await pool.query(`
            SELECT 
                d.simbol,
                d.naziv_tvrtke,
                d.sektor,
                d.trzisna_kapitalizacija,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'simbol', dp.simbol,
                            'datum', dp.datum,
                            'cijena_otvaranja', dp.cijena_otvaranja,
                            'cijena_zatvaranja', dp.cijena_zatvaranja,
                            'najvisa_cijena', dp.najvisa_cijena,
                            'najniza_cijena', dp.najniza_cijena,
                            'postotak_promjene', dp.postotak_promjene,
                            'volumen', dp.volumen
                        ) ORDER BY dp.datum DESC
                    ) FILTER (WHERE dp.simbol IS NOT NULL),
                    '[]'::json
                ) as dnevne_promjene
            FROM dionice d
            LEFT JOIN dnevne_promjene dp ON d.simbol = dp.simbol
            WHERE d.sektor = $1
            GROUP BY d.simbol, d.naziv_tvrtke, d.sektor, d.trzisna_kapitalizacija
            ORDER BY d.trzisna_kapitalizacija DESC
        `, [sektor]);
        
        if (result.rows.length === 0) {
            return res.status(404).json(responseWrapper(
                null,
                "Not Found",
                `Nema dionica u sektoru '${sektor}'`
            ));
        }
        
        res.status(200).json(responseWrapper(
            result.rows,
            "OK",
            `Dionice u sektoru '${sektor}' uspješno dohvaćene`
        ));
    } catch (error) {
        console.error('Greška pri dohvatu dionica po sektoru:', error);
        res.status(500).json(responseWrapper(
            null,
            "Internal Server Error",
            "Greška pri dohvatu dionica po sektoru"
        ));
    }
});

// Dohvat top dionica

app.get('/api/dionice/top/:broj', async (req, res) => {
    try {
        const broj = parseInt(req.params.broj);
        const { datum } = req.query;
        
        // Validacija broja
        if (isNaN(broj) || broj <= 0 || broj > 50) {
            return res.status(400).json(responseWrapper(
                null,
                "Bad Request",
                "Broj mora biti između 1 i 50"
            ));
        }
        
        let targetDatum = datum;
        
        // Ako datum nije specificiran, uzmi najnoviji
        if (!targetDatum) {
            const dateResult = await pool.query(
                'SELECT datum FROM dnevne_promjene ORDER BY datum DESC LIMIT 1'
            );
            
            if (dateResult.rows.length === 0) {
                return res.status(404).json(responseWrapper(
                    null,
                    "Not Found",
                    "Nema dostupnih dnevnih promjena"
                ));
            }
            
            targetDatum = dateResult.rows[0].datum;
        }
        
        // Validacija datuma
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(targetDatum)) {
            return res.status(400).json(responseWrapper(
                null,
                "Bad Request",
                "Neispravan format datuma. Koristite YYYY-MM-DD"
            ));
        }
        
        // Dohvati top dionice za određeni datum
        const result = await pool.query(`
            SELECT 
                d.simbol,
                d.naziv_tvrtke,
                d.sektor,
                dp.datum,
                dp.cijena_otvaranja,
                dp.cijena_zatvaranja,
                dp.najvisa_cijena,
                dp.najniza_cijena,
                dp.postotak_promjene,
                dp.volumen,
                ROW_NUMBER() OVER (ORDER BY dp.postotak_promjene DESC) as rang
            FROM dionice d
            JOIN dnevne_promjene dp ON d.simbol = dp.simbol
            WHERE dp.datum = $1 AND dp.postotak_promjene > 0
            ORDER BY dp.postotak_promjene DESC
            LIMIT $2
        `, [targetDatum, broj]);
        
        if (result.rows.length === 0) {
            return res.status(404).json(responseWrapper(
                null,
                "Not Found",
                `Nema pozitivnih promjena za datum ${targetDatum}`
            ));
        }
        
        // Formatiraj odgovor prema shemi
        const topDionice = result.rows.map(row => ({
            simbol: row.simbol,
            naziv_tvrtke: row.naziv_tvrtke,
            sektor: row.sektor,
            rang: row.rang,
            dnevna_promjena: {
                simbol: row.simbol,
                datum: row.datum,
                cijena_otvaranja: row.cijena_otvaranja,
                cijena_zatvaranja: row.cijena_zatvaranja,
                najvisa_cijena: row.najvisa_cijena,
                najniz_cijena: row.najniza_cijena,
                postotak_promjene: row.postotak_promjene,
                volumen: row.volumen
            }
        }));
        
        res.status(200).json(responseWrapper(
            topDionice,
            "OK",
            `Top ${broj} dionica po rastu za datum ${targetDatum}`
        ));

    } catch (error) {
        console.error('Greška pri dohvatu top dionica:', error);
        res.status(500).json(responseWrapper(
            null,
            "Internal Server Error",
            "Greška pri dohvatu top dionica"
        ));
    }
});

// Dohvat bottom dionica

app.get('/api/dionice/bottom/:broj', async (req, res) => {
    try {
        const broj = parseInt(req.params.broj);
        const { datum } = req.query;
        
        // Validacija broja
        if (isNaN(broj) || broj <= 0 || broj > 50) {
            return res.status(400).json(responseWrapper(
                null,
                "Bad Request",
                "Broj mora biti između 1 i 50"
            ));
        }
        
        let targetDatum = datum;
        
        // Ako datum nije specificiran, uzmi najnoviji
        if (!targetDatum) {
            const dateResult = await pool.query(
                'SELECT datum FROM dnevne_promjene ORDER BY datum DESC LIMIT 1'
            );
            
            if (dateResult.rows.length === 0) {
                return res.status(404).json(responseWrapper(
                    null,
                    "Not Found",
                    "Nema dostupnih dnevnih promjena"
                ));
            }
            
            targetDatum = dateResult.rows[0].datum;
        }
        
        // Validacija datuma
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(targetDatum)) {
            return res.status(400).json(responseWrapper(
                null,
                "Bad Request",
                "Neispravan format datuma. Koristite YYYY-MM-DD"
            ));
        }
        
        // Dohvati bottom dionice za određeni datum
        const result = await pool.query(`
            SELECT 
                d.simbol,
                d.naziv_tvrtke,
                d.sektor,
                dp.datum,
                dp.cijena_otvaranja,
                dp.cijena_zatvaranja,
                dp.najvisa_cijena,
                dp.najniza_cijena,
                dp.postotak_promjene,
                dp.volumen,
                ROW_NUMBER() OVER (ORDER BY dp.postotak_promjene ASC) as rang
            FROM dionice d
            JOIN dnevne_promjene dp ON d.simbol = dp.simbol
            WHERE dp.datum = $1 AND dp.postotak_promjene < 0
            ORDER BY dp.postotak_promjene ASC
            LIMIT $2
        `, [targetDatum, broj]);
        
        if (result.rows.length === 0) {
            return res.status(404).json(responseWrapper(
                null,
                "Not Found",
                `Nema negativnih promjena za datum ${targetDatum}`
            ));
        }
        
        // Formatiraj odgovor prema shemi
        const bottomDionice = result.rows.map(row => ({
            simbol: row.simbol,
            naziv_tvrtke: row.naziv_tvrtke,
            sektor: row.sektor,
            rang: row.rang,
            dnevna_promjena: {
                simbol: row.simbol,
                datum: row.datum,
                cijena_otvaranja: row.cijena_otvaranja,
                cijena_zatvaranja: row.cijena_zatvaranja,
                najvisa_cijena: row.najvisa_cijena,
                najniz_cijena: row.najniza_cijena,
                postotak_promjene: row.postotak_promjene,
                volumen: row.volumen
            }
        }));
        
        res.status(200).json(responseWrapper(
            bottomDionice,
            "OK",
            `Bottom ${broj} dionica po padu za datum ${targetDatum}`
        ));
    } catch (error) {
        console.error('Greška pri dohvatu bottom dionica:', error);
        res.status(500).json(responseWrapper(
            null,
            "Internal Server Error",
            "Greška pri dohvatu bottom dionica"
        ));
    }
});


app.use((req, res) => {
    res.status(404).json(responseWrapper(
        null,
        "Not Found",
        `Endpoint '${req.originalUrl}' ne postoji`
    ));
});

