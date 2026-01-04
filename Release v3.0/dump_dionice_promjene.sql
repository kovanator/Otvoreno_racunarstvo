--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dionice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dionice (
    simbol character varying(10) NOT NULL,
    naziv_tvrtke character varying(50) NOT NULL,
    sektor character varying(50),
    trzisna_kapitalizacija bigint
);


--
-- Name: dnevne_promjene; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dnevne_promjene (
    simbol character varying(10) NOT NULL,
    datum date NOT NULL,
    cijena_otvaranja numeric(10,2),
    cijena_zatvaranja numeric(10,2),
    najvisa_cijena numeric(10,2),
    najniza_cijena numeric(10,2),
    postotak_promjene numeric(10,2),
    volumen bigint
);


--
-- Data for Name: dionice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dionice (simbol, naziv_tvrtke, sektor, trzisna_kapitalizacija) FROM stdin;
NVDA	Nvidia	Tehnologija	4530000000000
AAPL	Apple	Tehnologija	3900000000000
MSFT	Microsoft	Tehnologija	3892000000000
GOOGL	Alphabet Inc.	Tehnologija	3150000000000
AMZN	Amazon.com Inc.	Potrošački sektor	2390000000000
AVGO	Broadcom	Tehnologija	1670000000000
2222.SR	Saudi Aramco	Energija	1667000000000
TSM	TSMC	Tehnologija	1529000000000
TSLA	Tesla	Automobilska industrija	1442000000000
META	Meta Platforms Inc.	Tehnologija	1850000000000
\.


--
-- Data for Name: dnevne_promjene; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dnevne_promjene (simbol, datum, cijena_otvaranja, cijena_zatvaranja, najvisa_cijena, najniza_cijena, postotak_promjene, volumen) FROM stdin;
NVDA	2025-10-24	183.83	186.26	187.47	183.50	1.34	131296700
AAPL	2025-10-24	261.19	262.82	264.13	259.18	1.25	38253720
MSFT	2025-10-24	425.26	424.73	425.34	422.90	-0.13	15532360
GOOGL	2025-10-24	256.58	259.92	261.68	255.31	2.70	28655126
AMZN	2025-10-24	221.97	224.21	225.40	221.90	1.01	38620200
AVGO	2025-10-24	352.51	354.13	358.30	350.87	0.46	16143739
2222.SR	2025-10-24	26.00	25.86	26.16	25.66	-0.54	29079561
TSM	2025-10-24	295.57	294.96	297.75	294.39	-0.21	8731100
TSLA	2025-10-24	446.83	433.72	451.68	430.17	-2.93	94408400
META	2025-10-24	736.79	738.36	741.41	731.15	0.21	9137700
AAPL	2025-10-23	259.94	259.58	260.62	258.01	-0.14	32754900
AAPL	2025-10-22	262.65	258.45	262.85	255.43	-1.52	45015300
MSFT	2025-10-23	522.46	520.65	523.95	518.61	-0.34	14023500
NVDA	2025-10-23	180.42	182.16	183.03	179.79	0.96	111363700
NVDA	2025-10-22	181.14	180.28	183.44	176.76	1.27	162249600
NVDA	2025-10-21	182.79	181.16	182.79	179.80	-0.89	124240200
TSLA	2025-10-23	420.00	449.98	449.40	413.90	7.13	126709800
TSM	2025-10-23	289.90	290.73	294.09	289.63	0.29	10379900
\.


--
-- Name: dionice dionice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dionice
    ADD CONSTRAINT dionice_pkey PRIMARY KEY (simbol);


--
-- Name: dnevne_promjene dnevne_promjene_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dnevne_promjene
    ADD CONSTRAINT dnevne_promjene_pkey PRIMARY KEY (simbol, datum);


--
-- Name: dnevne_promjene dnevne_promjene_simbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dnevne_promjene
    ADD CONSTRAINT dnevne_promjene_simbol_fkey FOREIGN KEY (simbol) REFERENCES public.dionice(simbol) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

