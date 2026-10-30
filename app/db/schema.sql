\restrict dbmate

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

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

--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'PENDING_PAYMENT',
    'CONFIRMED',
    'FAILED',
    'EXPIRED',
    'PAID_AFTER_EXPIRY'
);


--
-- Name: language; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.language AS ENUM (
    'en',
    'fr',
    'sw'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: boats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boats (
    id uuid DEFAULT uuidv7() NOT NULL,
    name text NOT NULL,
    seat_rows integer NOT NULL,
    seat_columns integer NOT NULL,
    CONSTRAINT boats_seat_columns_check CHECK (((seat_columns > 0) AND ((seat_columns % 2) = 0))),
    CONSTRAINT boats_seat_rows_check CHECK ((seat_rows > 0))
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT uuidv7() NOT NULL,
    reference text NOT NULL,
    trip_id uuid NOT NULL,
    seat text NOT NULL,
    phone text NOT NULL,
    language public.language NOT NULL,
    amount_cents integer NOT NULL,
    payment_reference uuid NOT NULL,
    status public.booking_status DEFAULT 'PENDING_PAYMENT'::public.booking_status NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bookings_amount_cents_check CHECK ((amount_cents > 0))
);


--
-- Name: ports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ports (
    id uuid DEFAULT uuidv7() NOT NULL,
    name text NOT NULL
);


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    id uuid DEFAULT uuidv7() NOT NULL,
    origin_port_id uuid NOT NULL,
    destination_port_id uuid NOT NULL,
    fare_cents integer NOT NULL,
    CONSTRAINT routes_check CHECK ((origin_port_id <> destination_port_id)),
    CONSTRAINT routes_fare_cents_check CHECK ((fare_cents > 0))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT uuidv7() NOT NULL,
    booking_id uuid NOT NULL,
    sms_sent_at timestamp with time zone,
    pdf_location text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id uuid DEFAULT uuidv7() NOT NULL,
    route_id uuid NOT NULL,
    boat_id uuid NOT NULL,
    departs_at timestamp with time zone NOT NULL,
    arrives_at timestamp with time zone NOT NULL,
    CONSTRAINT trips_check CHECK ((arrives_at > departs_at))
);


--
-- Name: boats boats_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boats
    ADD CONSTRAINT boats_name_key UNIQUE (name);


--
-- Name: boats boats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boats
    ADD CONSTRAINT boats_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_payment_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_payment_reference_key UNIQUE (payment_reference);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_reference_key UNIQUE (reference);


--
-- Name: ports ports_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_name_key UNIQUE (name);


--
-- Name: ports ports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_pkey PRIMARY KEY (id);


--
-- Name: routes routes_origin_port_id_destination_port_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_origin_port_id_destination_port_id_key UNIQUE (origin_port_id, destination_port_id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: tickets tickets_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_booking_id_key UNIQUE (booking_id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: trips trips_boat_id_departs_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_boat_id_departs_at_key UNIQUE (boat_id, departs_at);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: one_active_booking_per_seat; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX one_active_booking_per_seat ON public.bookings USING btree (trip_id, seat) WHERE (status = ANY (ARRAY['PENDING_PAYMENT'::public.booking_status, 'CONFIRMED'::public.booking_status]));


--
-- Name: bookings bookings_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: routes routes_destination_port_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_destination_port_id_fkey FOREIGN KEY (destination_port_id) REFERENCES public.ports(id);


--
-- Name: routes routes_origin_port_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_origin_port_id_fkey FOREIGN KEY (origin_port_id) REFERENCES public.ports(id);


--
-- Name: tickets tickets_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: trips trips_boat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_boat_id_fkey FOREIGN KEY (boat_id) REFERENCES public.boats(id);


--
-- Name: trips trips_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20261030120000');
