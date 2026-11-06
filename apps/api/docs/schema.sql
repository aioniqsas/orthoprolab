-- GENERATED FILE. Do not edit by hand.
-- Regenerate with: bun run db:schema (needs infra:up and migrations applied).

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

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
-- Name: clinica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinica (
    id bigint NOT NULL,
    nombre character varying NOT NULL,
    direccion character varying,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    correo character varying
);


--
-- Name: clinica_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.clinica ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.clinica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: contenido_web; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contenido_web (
    clave character varying(120) NOT NULL,
    valor text NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cuenta_cobro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuenta_cobro (
    id bigint NOT NULL,
    numero character varying(20) NOT NULL,
    estado character varying(20) DEFAULT 'borrador'::character varying NOT NULL,
    fecha_emision date,
    fecha_vencimiento date,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    pdf_url character varying(500),
    pdf_hash character varying(64),
    observaciones text,
    creada_por uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    clinica_id bigint NOT NULL
);


--
-- Name: cuenta_cobro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cuenta_cobro ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cuenta_cobro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cuenta_cobro_orden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuenta_cobro_orden (
    cuenta_cobro_id bigint NOT NULL,
    orden_id bigint NOT NULL,
    valor_snapshot numeric(12,2) NOT NULL
);


--
-- Name: detalle_orden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_orden (
    id bigint NOT NULL,
    orden_id bigint NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario numeric(12,2),
    observaciones text,
    color_diente text,
    dientes jsonb DEFAULT '[]'::jsonb NOT NULL,
    servicio text NOT NULL,
    CONSTRAINT ck_detalle_orden_cantidad CHECK ((cantidad > 0)),
    CONSTRAINT ck_detalle_orden_dientes CHECK ((jsonb_typeof(dientes) = 'array'::text)),
    CONSTRAINT ck_detalle_orden_precio CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: detalle_orden_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.detalle_orden ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.detalle_orden_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: doctor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor (
    id bigint NOT NULL,
    clinica_id bigint NOT NULL,
    nombres character varying NOT NULL,
    apellidos character varying NOT NULL,
    correo character varying,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doctor_new_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.doctor ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.doctor_new_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: envio_cuenta_cobro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.envio_cuenta_cobro (
    id bigint NOT NULL,
    cuenta_cobro_id bigint NOT NULL,
    enviado_a character varying(254) NOT NULL,
    estado character varying(20) NOT NULL,
    error text,
    enviado_por uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: envio_cuenta_cobro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.envio_cuenta_cobro ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.envio_cuenta_cobro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: estado_orden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_orden (
    id bigint NOT NULL,
    codigo character varying NOT NULL,
    nombre character varying NOT NULL,
    posicion integer NOT NULL,
    es_final boolean DEFAULT false NOT NULL
);


--
-- Name: estado_orden_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.estado_orden ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.estado_orden_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: historial_estado_orden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_estado_orden (
    id bigint NOT NULL,
    orden_id bigint NOT NULL,
    estado_anterior_id bigint,
    estado_nuevo_id bigint NOT NULL,
    usuario_id uuid NOT NULL,
    fecha_cambio timestamp with time zone DEFAULT now() NOT NULL,
    observaciones text
);


--
-- Name: historial_estado_orden_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.historial_estado_orden ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.historial_estado_orden_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: metodo_pago_bancario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodo_pago_bancario (
    id bigint NOT NULL,
    banco character varying(120) NOT NULL,
    tipo_cuenta character varying(60) NOT NULL,
    numero_cuenta character varying(40) NOT NULL,
    titular character varying(160) NOT NULL,
    qr_url character varying(500),
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: metodo_pago_bancario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.metodo_pago_bancario ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.metodo_pago_bancario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: orden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden (
    id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    estado_id bigint NOT NULL,
    valor numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    urgente boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_entrega timestamp with time zone,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    doctor_id bigint,
    CONSTRAINT ck_orden_fecha_entrega CHECK (((fecha_entrega IS NULL) OR (fecha_entrega >= fecha_creacion))),
    CONSTRAINT ck_orden_valor_no_negativo CHECK ((valor >= (0)::numeric))
);


--
-- Name: orden_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.orden ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.orden_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: paciente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paciente (
    id bigint NOT NULL,
    nombre text NOT NULL,
    cedula text,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    cedula_hash character(64)
);


--
-- Name: paciente_doctor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paciente_doctor (
    paciente_id bigint NOT NULL,
    fecha_asignacion timestamp with time zone DEFAULT now() NOT NULL,
    doctor_id bigint NOT NULL
);


--
-- Name: paciente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.paciente ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.paciente_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pago (
    id bigint NOT NULL,
    cuenta_cobro_id bigint NOT NULL,
    monto numeric(12,2) NOT NULL,
    fecha_pago date NOT NULL,
    metodo character varying(30) NOT NULL,
    referencia character varying(100),
    notas text,
    registrado_por uuid NOT NULL,
    anulado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    comprobante_url character varying(500),
    comprobante_nombre character varying(255)
);


--
-- Name: pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pago ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pago_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol (
    id bigint NOT NULL,
    nombre character varying NOT NULL,
    descripcion text
);


--
-- Name: rol_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rol ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.rol_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: servicio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicio (
    id bigint NOT NULL,
    nombre character varying NOT NULL,
    descripcion text,
    precio numeric(12,2) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    slug character varying NOT NULL,
    imagen_url text,
    imagen_public_id text,
    CONSTRAINT ck_servicio_imagen_url_cloudinary CHECK (((imagen_url IS NULL) OR (imagen_url ~~ 'https://res.cloudinary.com/%'::text))),
    CONSTRAINT ck_servicio_precio_no_negativo CHECK ((precio >= (0)::numeric))
);


--
-- Name: servicio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.servicio ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.servicio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sesion_refresco; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesion_refresco (
    id bigint NOT NULL,
    usuario_id uuid NOT NULL,
    familia_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    revocada_en timestamp with time zone,
    reemplazada_por_id bigint,
    creada_en timestamp with time zone DEFAULT now() NOT NULL,
    ultimo_uso_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sesion_refresco_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sesion_refresco ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sesion_refresco_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cedula text NOT NULL,
    nombres character varying NOT NULL,
    apellidos character varying NOT NULL,
    correo character varying NOT NULL,
    password_hash character varying NOT NULL,
    rol_id bigint NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    cedula_hash character(64) NOT NULL,
    clinica_id bigint,
    reset_token_hash character varying,
    reset_token_expires timestamp with time zone
);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: estado_orden PK_2a43d4453d2a2888732cd961e70; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_orden
    ADD CONSTRAINT "PK_2a43d4453d2a2888732cd961e70" PRIMARY KEY (id);


--
-- Name: orden PK_7dc2f9c066419f6f0782cafb454; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden
    ADD CONSTRAINT "PK_7dc2f9c066419f6f0782cafb454" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: usuario PK_a56c58e5cabaa04fb2c98d2d7e2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY (id);


--
-- Name: clinica PK_a5868356fca535972d7aa945704; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinica
    ADD CONSTRAINT "PK_a5868356fca535972d7aa945704" PRIMARY KEY (id);


--
-- Name: servicio PK_a589f335f4fc94f913c9f86e608; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio
    ADD CONSTRAINT "PK_a589f335f4fc94f913c9f86e608" PRIMARY KEY (id);


--
-- Name: historial_estado_orden PK_c35b6123de1fd5919aa9d37acf4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_estado_orden
    ADD CONSTRAINT "PK_c35b6123de1fd5919aa9d37acf4" PRIMARY KEY (id);


--
-- Name: rol PK_c93a22388638fac311781c7f2dd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT "PK_c93a22388638fac311781c7f2dd" PRIMARY KEY (id);


--
-- Name: paciente PK_cbcb7985432e4b49d32c5243867; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paciente
    ADD CONSTRAINT "PK_cbcb7985432e4b49d32c5243867" PRIMARY KEY (id);


--
-- Name: detalle_orden PK_cf957cf32507d27e6015ea93515; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_orden
    ADD CONSTRAINT "PK_cf957cf32507d27e6015ea93515" PRIMARY KEY (id);


--
-- Name: estado_orden UQ_01e71fd3d24b75572af07df8be4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_orden
    ADD CONSTRAINT "UQ_01e71fd3d24b75572af07df8be4" UNIQUE (codigo);


--
-- Name: servicio UQ_20f03be6b4f4f61b0485182c1e5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio
    ADD CONSTRAINT "UQ_20f03be6b4f4f61b0485182c1e5" UNIQUE (nombre);


--
-- Name: rol UQ_9792c580a992d554ee1621c5b45; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT "UQ_9792c580a992d554ee1621c5b45" UNIQUE (nombre);


--
-- Name: cuenta_cobro cuenta_cobro_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuenta_cobro
    ADD CONSTRAINT cuenta_cobro_numero_key UNIQUE (numero);


--
-- Name: cuenta_cobro_orden cuenta_cobro_orden_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuenta_cobro_orden
    ADD CONSTRAINT cuenta_cobro_orden_pkey PRIMARY KEY (cuenta_cobro_id, orden_id);


--
-- Name: cuenta_cobro cuenta_cobro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuenta_cobro
    ADD CONSTRAINT cuenta_cobro_pkey PRIMARY KEY (id);


--
-- Name: doctor doctor_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor
    ADD CONSTRAINT doctor_new_pkey PRIMARY KEY (id);


--
-- Name: envio_cuenta_cobro envio_cuenta_cobro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.envio_cuenta_cobro
    ADD CONSTRAINT envio_cuenta_cobro_pkey PRIMARY KEY (id);


--
-- Name: metodo_pago_bancario metodo_pago_bancario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodo_pago_bancario
    ADD CONSTRAINT metodo_pago_bancario_pkey PRIMARY KEY (id);


--
-- Name: paciente_doctor paciente_doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paciente_doctor
    ADD CONSTRAINT paciente_doctor_pkey PRIMARY KEY (paciente_id, doctor_id);


--
-- Name: pago pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_pkey PRIMARY KEY (id);


--
-- Name: contenido_web pk_contenido_web; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contenido_web
    ADD CONSTRAINT pk_contenido_web PRIMARY KEY (clave);


--
-- Name: sesion_refresco pk_sesion_refresco; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesion_refresco
    ADD CONSTRAINT pk_sesion_refresco PRIMARY KEY (id);


--
-- Name: idx_cuenta_cobro_orden_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuenta_cobro_orden_orden ON public.cuenta_cobro_orden USING btree (orden_id);


--
-- Name: idx_detalle_orden_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_orden_orden ON public.detalle_orden USING btree (orden_id);


--
-- Name: idx_historial_orden_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_orden_fecha ON public.historial_estado_orden USING btree (orden_id, fecha_cambio);


--
-- Name: idx_orden_doctor_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_doctor_fecha ON public.orden USING btree (doctor_id, fecha_creacion DESC);


--
-- Name: idx_orden_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_estado ON public.orden USING btree (estado_id);


--
-- Name: idx_orden_paciente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orden_paciente ON public.orden USING btree (paciente_id);


--
-- Name: idx_pago_cuenta_cobro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pago_cuenta_cobro ON public.pago USING btree (cuenta_cobro_id);


--
-- Name: idx_sesion_refresco_expira; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesion_refresco_expira ON public.sesion_refresco USING btree (expira_en);


--
-- Name: idx_sesion_refresco_familia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesion_refresco_familia ON public.sesion_refresco USING btree (familia_id);


--
-- Name: idx_sesion_refresco_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesion_refresco_usuario ON public.sesion_refresco USING btree (usuario_id);


--
-- Name: uq_paciente_cedula_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_paciente_cedula_hash ON public.paciente USING btree (cedula_hash) WHERE (cedula_hash IS NOT NULL);


--
-- Name: uq_servicio_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_servicio_slug ON public.servicio USING btree (slug);


--
-- Name: uq_sesion_refresco_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sesion_refresco_token_hash ON public.sesion_refresco USING btree (token_hash);


--
-- Name: uq_usuario_cedula_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_usuario_cedula_hash ON public.usuario USING btree (cedula_hash);


--
-- Name: uq_usuario_correo_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_usuario_correo_lower ON public.usuario USING btree (lower((correo)::text));


--
-- Name: historial_estado_orden FK_22893e5083442f13bb964b24dd6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_estado_orden
    ADD CONSTRAINT "FK_22893e5083442f13bb964b24dd6" FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: usuario FK_6c336b0a51b5c4d22614cb02533; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT "FK_6c336b0a51b5c4d22614cb02533" FOREIGN KEY (rol_id) REFERENCES public.rol(id) ON DELETE RESTRICT;


--
-- Name: detalle_orden FK_8633a4a37c368f1e7dda4c866dc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_orden
    ADD CONSTRAINT "FK_8633a4a37c368f1e7dda4c866dc" FOREIGN KEY (orden_id) REFERENCES public.orden(id) ON DELETE RESTRICT;


--
-- Name: historial_estado_orden FK_981d1fec49a4fb5af5e50a8d8fb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_estado_orden
    ADD CONSTRAINT "FK_981d1fec49a4fb5af5e50a8d8fb" FOREIGN KEY (estado_anterior_id) REFERENCES public.estado_orden(id) ON DELETE RESTRICT;


--
-- Name: paciente_doctor FK_9d8d4986c8a5f500ae2030db139; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paciente_doctor
    ADD CONSTRAINT "FK_9d8d4986c8a5f500ae2030db139" FOREIGN KEY (paciente_id) REFERENCES public.paciente(id) ON DELETE RESTRICT;


--
-- Name: orden FK_a3fd26abb795b984a7b710ff131; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden
    ADD CONSTRAINT "FK_a3fd26abb795b984a7b710ff131" FOREIGN KEY (estado_id) REFERENCES public.estado_orden(id) ON DELETE RESTRICT;


--
-- Name: historial_estado_orden FK_bc138d6088560ead37cfb000643; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_estado_orden
    ADD CONSTRAINT "FK_bc138d6088560ead37cfb000643" FOREIGN KEY (orden_id) REFERENCES public.orden(id) ON DELETE RESTRICT;


--
-- Name: historial_estado_orden FK_dd0cd30ade629362196327faa07; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_estado_orden
    ADD CONSTRAINT "FK_dd0cd30ade629362196327faa07" FOREIGN KEY (estado_nuevo_id) REFERENCES public.estado_orden(id) ON DELETE RESTRICT;


--
-- Name: cuenta_cobro cuenta_cobro_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuenta_cobro
    ADD CONSTRAINT cuenta_cobro_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinica(id) ON DELETE RESTRICT;


--
-- Name: cuenta_cobro cuenta_cobro_creada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuenta_cobro
    ADD CONSTRAINT cuenta_cobro_creada_por_fkey FOREIGN KEY (creada_por) REFERENCES public.usuario(id);


--
-- Name: cuenta_cobro_orden cuenta_cobro_orden_cuenta_cobro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuenta_cobro_orden
    ADD CONSTRAINT cuenta_cobro_orden_cuenta_cobro_id_fkey FOREIGN KEY (cuenta_cobro_id) REFERENCES public.cuenta_cobro(id) ON DELETE CASCADE;


--
-- Name: cuenta_cobro_orden cuenta_cobro_orden_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuenta_cobro_orden
    ADD CONSTRAINT cuenta_cobro_orden_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.orden(id);


--
-- Name: doctor doctor_new_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor
    ADD CONSTRAINT doctor_new_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinica(id) ON DELETE RESTRICT;


--
-- Name: envio_cuenta_cobro envio_cuenta_cobro_cuenta_cobro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.envio_cuenta_cobro
    ADD CONSTRAINT envio_cuenta_cobro_cuenta_cobro_id_fkey FOREIGN KEY (cuenta_cobro_id) REFERENCES public.cuenta_cobro(id);


--
-- Name: envio_cuenta_cobro envio_cuenta_cobro_enviado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.envio_cuenta_cobro
    ADD CONSTRAINT envio_cuenta_cobro_enviado_por_fkey FOREIGN KEY (enviado_por) REFERENCES public.usuario(id);


--
-- Name: orden fk_orden_doctor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden
    ADD CONSTRAINT fk_orden_doctor FOREIGN KEY (doctor_id) REFERENCES public.doctor(id) ON DELETE RESTRICT;


--
-- Name: orden fk_orden_paciente_doctor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden
    ADD CONSTRAINT fk_orden_paciente_doctor FOREIGN KEY (paciente_id, doctor_id) REFERENCES public.paciente_doctor(paciente_id, doctor_id) ON DELETE RESTRICT;


--
-- Name: paciente_doctor fk_paciente_doctor_doctor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paciente_doctor
    ADD CONSTRAINT fk_paciente_doctor_doctor FOREIGN KEY (doctor_id) REFERENCES public.doctor(id) ON DELETE RESTRICT;


--
-- Name: sesion_refresco fk_sesion_refresco_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesion_refresco
    ADD CONSTRAINT fk_sesion_refresco_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: pago pago_cuenta_cobro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_cuenta_cobro_id_fkey FOREIGN KEY (cuenta_cobro_id) REFERENCES public.cuenta_cobro(id);


--
-- Name: pago pago_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuario(id);


--
-- Name: usuario usuario_clinica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_clinica_id_fkey FOREIGN KEY (clinica_id) REFERENCES public.clinica(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--


