do $$
declare
  v_agency_id uuid;
  v_user_id uuid;
  v_month text := '2026-05';
  v_prev_month text := '2026-04';
  v_contract record;
  v_owner record;
  v_settlement_id uuid;
  v_supplier_id uuid;
  v_lead_id uuid;
  v_property_id uuid;
  v_visit_id uuid;
begin
  alter table public.agencies
    add column if not exists messaging_instance text not null default 'agentcore',
    add column if not exists website_url text,
    add column if not exists instagram_url text,
    add column if not exists facebook_url text;

  alter table public.properties
    add column if not exists currency text not null default 'USD',
    add column if not exists exact_address text not null default '',
    add column if not exists property_type text not null default 'Departamento',
    add column if not exists bedrooms integer not null default 0,
    add column if not exists bathrooms numeric(5, 2) not null default 0,
    add column if not exists area numeric(10, 2) not null default 0,
    add column if not exists parking_spots integer not null default 0,
    add column if not exists furnished boolean not null default false,
    add column if not exists expenses numeric(14, 2),
    add column if not exists expenses_currency text,
    add column if not exists available_from date,
    add column if not exists pets_policy text not null default '',
    add column if not exists requirements text not null default '',
    add column if not exists amenities jsonb not null default '[]'::jsonb;

  alter table public.rental_contracts
    add column if not exists late_fee_daily_amount numeric(14, 2) not null default 0,
    add column if not exists late_fee_grace_days integer not null default 10,
    add column if not exists contract_file_name text,
    add column if not exists contract_file_path text,
    add column if not exists contract_file_mime_type text,
    add column if not exists contract_file_size_bytes integer,
    add column if not exists contract_text text not null default '',
    add column if not exists owner_name text,
    add column if not exists owner_phone text,
    add column if not exists owner_email text,
    add column if not exists management_fee_percent numeric(7, 2) not null default 0,
    add column if not exists monthly_owner_costs numeric(14, 2) not null default 0,
    add column if not exists owner_notes text not null default '';

  alter table public.owner_settlements
    add column if not exists contract_owner_id uuid references public.rental_contract_owners (id) on delete set null,
    add column if not exists participation_percent numeric(7, 2) not null default 100;

  alter table public.owner_transfers
    add column if not exists contract_owner_id uuid references public.rental_contract_owners (id) on delete set null;

  alter table public.owner_settlements
    drop constraint if exists owner_settlements_contract_id_settlement_month_key;

  create unique index if not exists owner_settlements_owner_cycle_uidx
    on public.owner_settlements ((coalesce(contract_owner_id, contract_id)), settlement_month);

  select id into v_agency_id from public.agencies where slug = 'ceballos';
  if v_agency_id is null then
    raise exception 'No existe la inmobiliaria con slug ceballos';
  end if;

  select id into v_user_id from public.profiles where email = 'ceballos@demo.com';

  update public.agencies
  set
    name = 'Ceballos',
    owner_name = 'Juan Ceballos',
    owner_email = 'ceballos@demo.com',
    phone = '011 4234-33213',
    city = 'CABA',
    plan = 'Scale',
    status = 'Activa',
    tagline = 'Propiedades seleccionadas en CABA con seguimiento comercial y administración integral.',
    website_url = 'https://props.com.ar/site/ceballos',
    instagram_url = 'https://instagram.com/ceballos.propiedades',
    facebook_url = 'https://facebook.com/ceballos.propiedades',
    updated_at = now()
  where id = v_agency_id;

  update public.profiles
  set
    full_name = 'Juan Ceballos',
    phone = '011423433213',
    role = 'agency_admin',
    agency_slug = 'ceballos',
    updated_at = now()
  where email = 'ceballos@demo.com';

  update public.crm_leads
  set
    full_name = case
      when full_name ilike '%debug cliente 2%' then 'Sofia Cabrera'
      when full_name ilike '%debug cliente%' then 'Nicolas Herrera'
      when full_name = 'por la tarde' then 'Rodrigo Alvarez'
      else full_name
    end,
    email = case
      when full_name ilike '%debug cliente 2%' then 'sofia.cabrera@email.com'
      when full_name ilike '%debug cliente%' then 'nicolas.herrera@email.com'
      when full_name = 'por la tarde' then 'rodrigo.alvarez@email.com'
      else email
    end,
    phone = case
      when full_name ilike '%debug cliente 2%' then '5491167894321'
      when full_name ilike '%debug cliente%' then '5491132457788'
      else phone
    end,
    updated_at = now()
  where agency_id = v_agency_id
    and (full_name ilike '%debug cliente%' or full_name = 'por la tarde');

  delete from public.employee_tasks where agency_id = v_agency_id and details like '[DEMO PROPS]%';
  delete from public.crm_leads where agency_id = v_agency_id and qualification_summary like '[DEMO PROPS]%';
  delete from public.supplier_invoices where agency_id = v_agency_id and notes like '[DEMO PROPS]%';
  delete from public.suppliers where agency_id = v_agency_id and notes like '[DEMO PROPS]%';
  delete from public.cash_movements where agency_id = v_agency_id and reference like '[DEMO PROPS]%';
  delete from public.owner_transfers where agency_id = v_agency_id and notes like '[DEMO PROPS]%';
  delete from public.properties where agency_id = v_agency_id and description like '[DEMO PROPS]%';

  insert into public.properties (
    agency_id, title, price, currency, location, exact_address, status, operation, description,
    image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses,
    expenses_currency, available_from, pets_policy, requirements, amenities, created_by, created_at, updated_at
  )
  values
    (v_agency_id, 'Monoambiente luminoso en Caballito', 800000, 'ARS', 'Caballito, CABA', 'Rosario 732, Caballito, CABA', 'Disponible', 'Alquiler',
      '[DEMO PROPS] Monoambiente al frente con balcón, cocina integrada, excelente luz natural y cercanía a Av. Rivadavia. Ideal para persona sola o pareja.',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Departamento', 1, 1, 38, 0, false, 95000, 'ARS', '2026-06-01', 'Mascotas pequeñas a consultar',
      'Ingresos demostrables, garantía propietaria o seguro de caución, mes de adelanto y depósito.',
      '["Balcón","Luminoso","Cerca de subte","Apto profesional"]'::jsonb, v_user_id, now() - interval '13 days', now()),
    (v_agency_id, 'Depto 2 ambientes en Balvanera', 700000, 'ARS', 'Balvanera, CABA', 'Av. Rivadavia 2700, Balvanera, CABA', 'Disponible', 'Alquiler',
      '[DEMO PROPS] Dos ambientes práctico, cocina separada, dormitorio con placard y ubicación estratégica cerca de Once y múltiples líneas de colectivo.',
      'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1560185007-5f0bb1866cab?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Departamento', 1, 1, 45, 0, false, 110000, 'ARS', '2026-05-25', 'Acepta mascota chica con compromiso de mantenimiento',
      'Seguro de caución o garantía familiar, recibos de sueldo y depósito equivalente a un mes.',
      '["Cocina separada","Placard","Buena conectividad","Bajas expensas"]'::jsonb, v_user_id, now() - interval '10 days', now()),
    (v_agency_id, '3 ambientes con balcón en Palermo', 1200000, 'ARS', 'Palermo, CABA', 'Pringles 1180, Palermo, CABA', 'Disponible', 'Alquiler',
      '[DEMO PROPS] Tres ambientes amplio con balcón corrido, living comedor, cocina independiente y excelente acceso a Av. Córdoba y subte B.',
      'https://images.unsplash.com/photo-1560448075-bb485b067938?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1560448075-bb485b067938?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Departamento', 2, 1, 72, 0, false, 180000, 'ARS', '2026-06-05', 'Acepta mascotas con cláusula de cuidado',
      'Garantía propietaria CABA o seguro Finaer, demostración de ingresos y referencias laborales.',
      '["Balcón","Subte cercano","Lavadero","Muy luminoso"]'::jsonb, v_user_id, now() - interval '9 days', now()),
    (v_agency_id, 'PH reciclado con patio en Villa Crespo', 950000, 'ARS', 'Villa Crespo, CABA', 'Camargo 920, Villa Crespo, CABA', 'Reservada', 'Alquiler',
      '[DEMO PROPS] PH reciclado en planta baja, patio propio, dos dormitorios y cocina comedor. Muy buena opción para familia chica.',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'PH', 2, 1, 64, 0, true, 60000, 'ARS', '2026-06-15', 'Acepta mascotas',
      'Seguro de caución, ingresos comprobables y depósito.',
      '["Patio","Reciclado","Sin encargado permanente","Amoblado parcial"]'::jsonb, v_user_id, now() - interval '8 days', now()),
    (v_agency_id, 'Casa familiar en Flores con terraza', 1450000, 'ARS', 'Flores, CABA', 'Caracas 540, Flores, CABA', 'Disponible', 'Alquiler',
      '[DEMO PROPS] Casa de tres dormitorios con terraza, parrilla, cochera y ambientes amplios. Ideal familia que necesita espacio exterior.',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Casa', 3, 2, 145, 1, false, null, null, '2026-07-01', 'Mascotas permitidas',
      'Garantía propietaria, ingresos familiares comprobables, depósito y firma certificada.',
      '["Terraza","Parrilla","Cochera","Patio"]'::jsonb, v_user_id, now() - interval '7 days', now()),
    (v_agency_id, 'Oficina al frente en Microcentro', 680000, 'ARS', 'Microcentro, CABA', 'Reconquista 420, San Nicolás, CABA', 'Disponible', 'Alquiler',
      '[DEMO PROPS] Oficina profesional con recepción, sala privada y kitchenette. Edificio con seguridad y cercanía a subte.',
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Oficina', 0, 1, 52, 0, true, 85000, 'ARS', '2026-05-20', '',
      'Contrato comercial, garantía o seguro, constancia de actividad e ingresos.',
      '["Seguridad","Subte cercano","Recepción","Apto profesional"]'::jsonb, v_user_id, now() - interval '6 days', now()),
    (v_agency_id, 'Departamento 2 ambientes en Núñez', 600000, 'ARS', 'Núñez, CABA', 'Quesada 2450, Núñez, CABA', 'Alquilada', 'Alquiler',
      '[DEMO PROPS] Departamento en piso alto, vista abierta, cocina integrada y buena ventilación. Contrato activo en administración.',
      'https://images.unsplash.com/photo-1560440021-33f9b867899d?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1560440021-33f9b867899d?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Departamento', 1, 1, 43, 0, false, 87000, 'ARS', '2026-05-01', 'No acepta mascotas',
      'Seguro de caución e ingresos demostrables.',
      '["Vista abierta","Piso alto","Cerca de tren","Bajas expensas"]'::jsonb, v_user_id, now() - interval '5 days', now()),
    (v_agency_id, 'Local comercial en Almagro', 1100000, 'ARS', 'Almagro, CABA', 'Medrano 680, Almagro, CABA', 'Disponible', 'Alquiler',
      '[DEMO PROPS] Local a la calle con vidriera, baño, depósito y persiana metálica. Zona de alto tránsito peatonal.',
      'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Local', 0, 1, 70, 0, false, 45000, 'ARS', '2026-06-10', '',
      'Garantía propietaria, habilitación según rubro y demostración de actividad.',
      '["Vidriera","Depósito","Persiana metálica","Alto tránsito"]'::jsonb, v_user_id, now() - interval '4 days', now()),
    (v_agency_id, 'Monoambiente apto crédito en Palermo Hollywood', 105000, 'USD', 'Palermo Hollywood, CABA', 'Guatemala 5500, Palermo, CABA', 'Disponible', 'Venta',
      '[DEMO PROPS] Monoambiente moderno con balcón, excelente renta estimada y ubicación premium en Palermo Hollywood.',
      'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Departamento', 1, 1, 35, 0, false, 120000, 'ARS', null, '',
      '', '["Balcón","Apto crédito","Renta temporaria","Amenities"]'::jsonb, v_user_id, now() - interval '11 days', now()),
    (v_agency_id, 'Semipiso 4 ambientes en Belgrano R', 285000, 'USD', 'Belgrano R, CABA', 'Mendoza 3100, Belgrano, CABA', 'Disponible', 'Venta',
      '[DEMO PROPS] Semipiso con palier privado, dependencia, cochera fija y balcón aterrazado en una de las zonas más buscadas.',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Departamento', 3, 2, 118, 1, false, 260000, 'ARS', null, '',
      '', '["Cochera","Palier privado","Balcón aterrazado","Dependencia"]'::jsonb, v_user_id, now() - interval '3 days', now()),
    (v_agency_id, 'PH con terraza propia en Chacarita', 158000, 'USD', 'Chacarita, CABA', 'Charlone 900, Chacarita, CABA', 'Disponible', 'Venta',
      '[DEMO PROPS] PH sin expensas con terraza propia, parrilla y gran potencial para modernizar.',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'PH', 2, 1, 82, 0, false, null, null, null, '',
      '', '["Terraza","Sin expensas","Parrilla","Potencial"]'::jsonb, v_user_id, now() - interval '2 days', now()),
    (v_agency_id, 'Casa lote propio en Parque Chacabuco', 245000, 'USD', 'Parque Chacabuco, CABA', 'Avenida Asamblea 1480, Parque Chacabuco, CABA', 'Disponible', 'Venta',
      '[DEMO PROPS] Casa sobre lote propio con garaje, patio, terraza y posibilidad de ampliación.',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80',
      '["https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80","https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1400&q=80"]'::jsonb,
      'Casa', 3, 2, 160, 1, false, null, null, null, '',
      '', '["Lote propio","Garaje","Patio","Terraza"]'::jsonb, v_user_id, now() - interval '1 day', now());

  insert into public.rental_contracts (
    property_id, agency_id, tenant_name, tenant_phone, tenant_email, current_rent, currency,
    index_type, adjustment_frequency_months, late_fee_daily_amount, late_fee_grace_days,
    contract_start_date, rent_reference_date, next_adjustment_date, last_adjustment_date,
    auto_notify, notification_channel, status, notes, contract_text, owner_name, owner_phone,
    owner_email, management_fee_percent, monthly_owner_costs, owner_notes, created_by, created_at, updated_at
  )
  select
    p.id, v_agency_id, c.tenant_name, c.tenant_phone, c.tenant_email, c.current_rent, 'ARS',
    c.index_type, c.frequency, c.late_fee_daily_amount, c.grace_days,
    c.start_date::date, c.reference_date::date, c.next_adjustment::date, c.last_adjustment::date,
    true, 'whatsapp', c.contract_status,
    '[DEMO PROPS] Contrato demo cargado para mostrar lectura, aumentos y avisos automaticos.',
    c.contract_text, c.owner_name, c.owner_phone, c.owner_email, c.management_fee, c.owner_costs,
    c.owner_notes, v_user_id, now() - interval '2 days', now()
  from public.properties p
  join (values
    ('Monoambiente luminoso en Caballito', 'Martina Lopez', '1134567788', 'martina.lopez@email.com', 800000::numeric, 'IPC', 3, 10000::numeric, 10, '2026-02-05', '2026-02-05', '2026-05-19', '2026-02-05', 'Activo', 'Contrato de locacion para vivienda. Ajuste trimestral por IPC. Mora con punitorio fijo de $10.000 por dia luego de 10 dias de gracia.', 'Carlos Rivas', '1160010203', 'carlos.rivas@email.com', 5::numeric, 25000::numeric, 'Propietario solicita liquidacion mensual y aviso ante mora.'),
    ('Depto 2 ambientes en Balvanera', 'Luis Ramirez', '1154029393', 'luis.ramirez@email.com', 700000::numeric, 'ICL', 4, 12000::numeric, 7, '2026-01-01', '2026-01-01', '2026-05-22', '2026-01-01', 'Activo', 'Contrato con ajuste cuatrimestral por ICL. Punitorio diario fijo de $12.000 desde el dia 8 de atraso.', 'Marcela Sued', '1144556677', 'marcela.sued@email.com', 6::numeric, 18000::numeric, 'Compartir comprobante de transferencia al finalizar liquidacion.'),
    ('3 ambientes con balcón en Palermo', 'Rodrigo Perez', '112346684702', 'rodrigo.perez@email.com', 1200000::numeric, 'IPC', 3, 15000::numeric, 10, '2026-03-05', '2026-03-05', '2026-06-05', null, 'Activo', 'Contrato de vivienda con ajuste trimestral por IPC. Acepta mascotas con clausula de conservacion. Punitorio diario $15.000 luego de 10 dias.', 'Laura Migliore', '1133339090', 'laura.migliore@email.com', 5::numeric, 30000::numeric, 'Tiene 100% de titularidad.'),
    ('PH reciclado con patio en Villa Crespo', 'Sofia Soria', '1167890011', 'sofia.soria@email.com', 950000::numeric, 'IPC', 3, 10000::numeric, 10, '2026-02-10', '2026-02-10', '2026-05-25', '2026-02-10', 'Activo', 'Contrato demo con ajuste IPC trimestral y punitorio fijo diario. Incluye inventario de muebles.', 'Hernan Toledo', '1155512345', 'hernan.toledo@email.com', 5::numeric, 22000::numeric, 'Administrar arreglos menores con aprobacion previa.'),
    ('Casa familiar en Flores con terraza', 'Paula Fernandez', '1178904455', 'paula.fernandez@email.com', 1450000::numeric, 'ICL', 6, 20000::numeric, 10, '2025-12-01', '2025-12-01', '2026-06-01', null, 'Activo', 'Contrato de casa familiar. Ajuste semestral por ICL. Punitorio diario fijo de $20.000 pasado el periodo de gracia.', 'Julia Benitez', '1122211199', 'julia.benitez@email.com', 6::numeric, 45000::numeric, 'Liquidar el dia 10 de cada mes.'),
    ('Oficina al frente en Microcentro', 'Estudio Gamarra SRL', '1132104455', 'admin@gamarra.com', 680000::numeric, 'IPC', 3, 9000::numeric, 5, '2026-02-01', '2026-02-01', '2026-05-20', '2026-02-01', 'Activo', 'Contrato comercial con ajuste por IPC cada tres meses. Mora desde el sexto dia con punitorio diario.', 'Nicolas Ferrer', '1165432222', 'nicolas.ferrer@email.com', 7::numeric, 12000::numeric, 'Factura de honorarios mensual.'),
    ('Departamento 2 ambientes en Núñez', 'Lucas Vasquez', '118329333', 'lucas.vasquez@email.com', 600000::numeric, 'IPC', 3, 10000::numeric, 10, '2026-01-05', '2026-01-05', '2026-06-05', '2026-04-05', 'Activo', 'Contrato activo en administracion. Ajuste trimestral por IPC. Requiere seguimiento de visita y mora demo.', 'Marta Caceres', '1155554433', 'marta.caceres@email.com', 5::numeric, 16000::numeric, 'Propietaria prefiere transferencia bancaria.'),
    ('Local comercial en Almagro', 'Comercial Delta SA', '1199887766', 'pagos@comercialdelta.com', 1100000::numeric, 'ICL', 4, 18000::numeric, 7, '2026-01-03', '2026-01-03', '2026-05-30', '2026-01-03', 'Activo', 'Contrato comercial. Ajuste por ICL cada cuatro meses. Punitorio diario fijo ante mora.', 'Daniel Larrea', '1140405050', 'daniel.larrea@email.com', 7::numeric, 28000::numeric, 'Enviar liquidacion por email y WhatsApp.')
  ) as c(property_title, tenant_name, tenant_phone, tenant_email, current_rent, index_type, frequency, late_fee_daily_amount, grace_days, start_date, reference_date, next_adjustment, last_adjustment, contract_status, contract_text, owner_name, owner_phone, owner_email, management_fee, owner_costs, owner_notes)
  on p.title = c.property_title
  where p.agency_id = v_agency_id and p.description like '[DEMO PROPS]%';

  for v_contract in
    select rc.*, p.title as property_title
    from public.rental_contracts rc
    join public.properties p on p.id = rc.property_id
    where rc.agency_id = v_agency_id and rc.notes like '[DEMO PROPS]%'
  loop
    insert into public.rental_contract_owners (
      contract_id, property_id, agency_id, full_name, email, phone, participation_percent,
      bank_alias, bank_account, notes, display_order, created_by
    )
    values
      (v_contract.id, v_contract.property_id, v_agency_id, v_contract.owner_name, v_contract.owner_email, v_contract.owner_phone, 100, lower(replace(v_contract.owner_name, ' ', '.')) || '.cbu', 'CBU 00000031000' || floor(random() * 999999)::int, '[DEMO PROPS] Propietario principal.', 1, v_user_id);

    if v_contract.property_title in ('3 ambientes con balcón en Palermo', 'Casa familiar en Flores con terraza') then
      insert into public.rental_contract_owners (
        contract_id, property_id, agency_id, full_name, email, phone, participation_percent,
        bank_alias, bank_account, notes, display_order, created_by
      )
      values
        (v_contract.id, v_contract.property_id, v_agency_id, 'Socio de ' || v_contract.owner_name, 'socio.' || lower(split_part(v_contract.owner_name, ' ', 1)) || '@email.com', '110000' || floor(1000 + random() * 8999)::int, 50, 'socio.' || lower(split_part(v_contract.owner_name, ' ', 1)), 'CBU 00000032000' || floor(random() * 999999)::int, '[DEMO PROPS] Copropietario demo.', 2, v_user_id)
      on conflict do nothing;

      update public.rental_contract_owners
      set participation_percent = 50
      where contract_id = v_contract.id and notes like '[DEMO PROPS]%';
    end if;

    insert into public.rental_collections (
      contract_id, property_id, agency_id, collection_month, expected_rent, collected_amount,
      payment_method, payment_date, status, notes, created_by
    )
    values
      (v_contract.id, v_contract.property_id, v_agency_id, v_prev_month, v_contract.current_rent, v_contract.current_rent, 'Transferencia', '2026-04-08'::date, 'Cobrada', '[DEMO PROPS] Alquiler cobrado y conciliado.', v_user_id),
      (v_contract.id, v_contract.property_id, v_agency_id, v_month, v_contract.current_rent,
        case
          when v_contract.tenant_name in ('Luis Ramirez','Lucas Vasquez','Comercial Delta SA') then 0
          when v_contract.tenant_name in ('Sofia Soria','Estudio Gamarra SRL') then round(v_contract.current_rent * 0.45, 2)
          else v_contract.current_rent
        end,
        'Transferencia',
        case
          when v_contract.tenant_name in ('Luis Ramirez','Lucas Vasquez','Comercial Delta SA','Sofia Soria','Estudio Gamarra SRL') then null
          else '2026-05-08'::date
        end,
        case
          when v_contract.tenant_name in ('Luis Ramirez','Lucas Vasquez','Comercial Delta SA') then 'Mora'
          when v_contract.tenant_name in ('Sofia Soria','Estudio Gamarra SRL') then 'Parcial'
          else 'Cobrada'
        end,
        '[DEMO PROPS] Estado de cobranza demo para mostrar panel de morosos.',
        v_user_id)
    on conflict (contract_id, collection_month) do update
      set expected_rent = excluded.expected_rent,
          collected_amount = excluded.collected_amount,
          payment_method = excluded.payment_method,
          payment_date = excluded.payment_date,
          status = excluded.status,
          notes = excluded.notes,
          updated_at = now();

    insert into public.rental_adjustments (
      contract_id, property_id, agency_id, index_type, applied_on, reference_start_date,
      reference_end_date, factor, previous_rent, new_rent, source_label, source_snapshot,
      message_body, notification_status, notification_response, notified_at
    )
    values (
      v_contract.id, v_contract.property_id, v_agency_id, v_contract.index_type,
      coalesce(v_contract.last_adjustment_date, '2026-05-01'), v_contract.rent_reference_date,
      coalesce(v_contract.last_adjustment_date, '2026-05-01'), 1.11850000,
      round(v_contract.current_rent / 1.1185, 2), v_contract.current_rent,
      'Calculo por indice oficial', '{"source": "official_index_seed"}'::jsonb,
      'Hola ' || split_part(v_contract.tenant_name, ' ', 1) || ', te informamos el ajuste del alquiler de ' || v_contract.property_title || '.',
      case when v_contract.tenant_name in ('Luis Ramirez') then 'Fallido' else 'Enviado' end,
      '{"status": "seeded_account"}'::jsonb,
      case when v_contract.tenant_name in ('Luis Ramirez') then null else now() - interval '1 day' end
    );

    for v_owner in
      select * from public.rental_contract_owners
      where contract_id = v_contract.id and notes like '[DEMO PROPS]%'
    loop
      insert into public.owner_settlements (
        contract_id, contract_owner_id, property_id, agency_id, settlement_month, owner_name,
        owner_email, owner_phone, participation_percent, rent_collected, management_fee_percent,
        management_fee_amount, monthly_owner_costs, other_charges_amount, other_charges_detail,
        owner_payout_amount, status, sent_at, paid_at, created_by
      )
      values (
        v_contract.id, v_owner.id, v_contract.property_id, v_agency_id, v_month,
        v_owner.full_name, v_owner.email, v_owner.phone, v_owner.participation_percent,
        round(v_contract.current_rent * v_owner.participation_percent / 100, 2),
        v_contract.management_fee_percent,
        round((v_contract.current_rent * v_owner.participation_percent / 100) * v_contract.management_fee_percent / 100, 2),
        round(v_contract.monthly_owner_costs * v_owner.participation_percent / 100, 2),
        case when v_contract.property_title like '%Palermo%' then 18000 else 0 end,
        case when v_contract.property_title like '%Palermo%' then 'Reparacion menor informada al propietario' else '' end,
        round((v_contract.current_rent * v_owner.participation_percent / 100) - ((v_contract.current_rent * v_owner.participation_percent / 100) * v_contract.management_fee_percent / 100) - (v_contract.monthly_owner_costs * v_owner.participation_percent / 100) - case when v_contract.property_title like '%Palermo%' then 18000 else 0 end, 2),
        case when v_contract.tenant_name in ('Martina Lopez','Rodrigo Perez','Paula Fernandez') then 'Pagada' else 'Emitida' end,
        now() - interval '2 days',
        case when v_contract.tenant_name in ('Martina Lopez','Rodrigo Perez','Paula Fernandez') then now() - interval '1 day' else null end,
        v_user_id
      )
      returning id into v_settlement_id;

      insert into public.owner_settlement_items (
        settlement_id, contract_id, contract_owner_id, agency_id, label, amount, effect,
        apply_management_fee, notes, created_by
      )
      values
        (v_settlement_id, v_contract.id, v_owner.id, v_agency_id, 'Honorarios de administracion', round((v_contract.current_rent * v_owner.participation_percent / 100) * v_contract.management_fee_percent / 100, 2), 'Descuento', false, '[DEMO PROPS] Calculado automaticamente.', v_user_id),
        (v_settlement_id, v_contract.id, v_owner.id, v_agency_id, 'Gastos mensuales del inmueble', round(v_contract.monthly_owner_costs * v_owner.participation_percent / 100, 2), 'Descuento', false, '[DEMO PROPS] Expensas extraordinarias o arreglos.', v_user_id);

      insert into public.owner_transfers (
        settlement_id, contract_id, contract_owner_id, property_id, agency_id, owner_name,
        amount, destination_label, transfer_date, status, notes, created_by
      )
      values (
        v_settlement_id, v_contract.id, v_owner.id, v_contract.property_id, v_agency_id,
        v_owner.full_name,
        greatest(0, round((v_contract.current_rent * v_owner.participation_percent / 100) - ((v_contract.current_rent * v_owner.participation_percent / 100) * v_contract.management_fee_percent / 100) - (v_contract.monthly_owner_costs * v_owner.participation_percent / 100), 2)),
        coalesce(v_owner.bank_alias, 'Alias pendiente'),
        case when v_contract.tenant_name in ('Martina Lopez','Rodrigo Perez','Paula Fernandez') then '2026-05-12'::date else null end,
        case when v_contract.tenant_name in ('Martina Lopez','Rodrigo Perez','Paula Fernandez') then 'Confirmada' else 'Pendiente' end,
        '[DEMO PROPS] Transferencia demo a propietario.',
        v_user_id
      );
    end loop;
  end loop;

  insert into public.cash_movements (agency_id, occurred_on, kind, category, amount, reference, notes, created_by)
  values
    (v_agency_id, '2026-05-08', 'Ingreso', 'Alquileres cobrados', 4350000, '[DEMO PROPS] Cobranza alquileres mayo', 'Ingresos cobrados por transferencia.', v_user_id),
    (v_agency_id, '2026-05-10', 'Egreso', 'Proveedores', 185000, '[DEMO PROPS] Cerrajeria y mantenimiento', 'Gastos operativos cargados para demo.', v_user_id),
    (v_agency_id, '2026-05-12', 'Transferencia', 'Propietarios', 3185000, '[DEMO PROPS] Transferencias propietarios', 'Pagos liquidados a propietarios.', v_user_id),
    (v_agency_id, '2026-05-15', 'Ingreso', 'Honorarios administracion', 286000, '[DEMO PROPS] Honorarios mayo', 'Comisiones de administracion registradas.', v_user_id);

  insert into public.suppliers (agency_id, name, service_type, contact_name, phone, email, notes, status, created_by)
  values
    (v_agency_id, 'Cerrajeria Norte', 'Cerrajeria', 'Diego Morales', '1167001122', 'cerrajerianorte@email.com', '[DEMO PROPS] Proveedor frecuente para cambios de cerradura.', 'Activo', v_user_id),
    (v_agency_id, 'Plomeria Rapida CABA', 'Plomeria', 'Valeria Gil', '1150407788', 'plomeriarapida@email.com', '[DEMO PROPS] Urgencias en alquileres administrados.', 'Activo', v_user_id),
    (v_agency_id, 'Fotos Pro Inmobiliarias', 'Fotografia', 'Agustin Rey', '1133304400', 'fotospro@email.com', '[DEMO PROPS] Fotos y video para publicaciones.', 'Activo', v_user_id);

  for v_supplier_id in select id from public.suppliers where agency_id = v_agency_id and notes like '[DEMO PROPS]%' loop
    insert into public.supplier_invoices (agency_id, supplier_id, invoice_number, concept, total_amount, due_date, status, notes, created_by)
    values (v_agency_id, v_supplier_id, 'DEMO-' || substring(v_supplier_id::text, 1, 6), 'Servicio operativo demo', 45000 + floor(random() * 90000), '2026-05-28', 'Emitida', '[DEMO PROPS] Factura demo pendiente o emitida.', v_user_id);
  end loop;

  insert into public.agency_message_templates (agency_id, template_key, label, body)
  values
    (v_agency_id, 'rental_requirements', 'Requisitos de alquiler', 'Hola, para alquilar solemos pedir ingresos demostrables, garantia propietaria o seguro de caucion, mes de adelanto, deposito y datos de contacto. Te confirmo los requisitos exactos segun la propiedad.'),
    (v_agency_id, 'sale_reply', 'Respuesta para venta', 'Hola, gracias por consultar. La propiedad esta disponible para visitar. Puedo enviarte ficha, ubicacion y coordinar una visita con el asesor.'),
    (v_agency_id, 'follow_up', 'Seguimiento amable', 'Hola, retomo tu consulta para saber si queres avanzar con una visita o si preferis que te pase opciones similares.'),
    (v_agency_id, 'visit_confirmation', 'Confirmacion de visita', 'Perfecto, dejamos registrada la visita. Te enviamos direccion, horario y contacto del asesor para coordinar.'),
    (v_agency_id, 'gentle_rejection', 'Rechazo amable', 'Gracias por tu consulta. Por ahora esa propiedad no encaja con lo que buscas, pero puedo pasarte alternativas similares.')
  on conflict (agency_id, template_key) do update
    set label = excluded.label, body = excluded.body, updated_at = now();

  insert into public.crm_leads (
    agency_id, property_id, full_name, email, phone, source, stage, priority, score,
    qualification_summary, ai_reply_draft, intent, desired_operation, desired_location,
    desired_timeline, budget, requirements_summary, last_customer_message, needs_response,
    next_follow_up_at, last_contacted_at, last_activity_at, owner_user_id, created_at, updated_at
  )
  select v_agency_id, p.id, l.full_name, l.email, l.phone, l.source, l.stage, l.priority, l.score,
    '[DEMO PROPS] ' || l.summary, l.reply, l.intent, l.operation, l.location,
    l.timeline, l.budget, l.requirements, l.last_message, l.needs_response,
    l.next_follow_up::timestamptz, l.last_contacted::timestamptz, l.activity::timestamptz, v_user_id,
    l.created::timestamptz, now()
  from (values
    ('Monoambiente luminoso en Caballito', 'Aldana Schmidt', 'aldana@email.com', '1155510101', 'web', 'Nuevo', 'Alta', 86, 'Busca alquiler en Caballito, acepta requisitos y quiere visitar esta semana.', 'Responder con disponibilidad y pedir franja horaria para visita.', 'coordinar visita', 'Alquiler', 'Caballito', 'esta semana', 'hasta $850.000', 'Mascota chica, ingresos en relacion de dependencia.', 'Hola, me interesa el monoambiente de Caballito. Aceptan mascota chica?', true, '2026-05-19 17:30-03', null, '2026-05-19 10:20-03', '2026-05-19 10:00-03'),
    ('3 ambientes con balcón en Palermo', 'Matias Rodriguez', 'matias@email.com', '5423233214213', 'web', 'Visita', 'Alta', 92, 'Quiere visitar el 3 ambientes, ya dejo telefono y disponibilidad por la tarde.', 'Confirmar que el equipo comercial lo contacta para cerrar horario.', 'visita', 'Alquiler', 'Palermo', 'viernes tarde', '$1.200.000', 'Acepta garantia propietaria y tiene mascota.', 'Estoy disponible el viernes a la tarde para visitar.', false, '2026-05-20 11:00-03', '2026-05-19 12:00-03', '2026-05-19 12:10-03', '2026-05-19 11:50-03'),
    ('Depto 2 ambientes en Balvanera', 'Lucas Vasquez', 'lucas@email.com', '118329333', 'whatsapp', 'Seguimiento', 'Alta', 78, 'Pidio visita, falta cerrar dia y horario. Ya respondio que puede el viernes a la tarde.', 'Proponer viernes 17:30 y confirmar direccion.', 'visita', 'Alquiler', 'Balvanera', 'viernes tarde', 'hasta $750.000', 'Pregunta por mascotas y cercania a transporte.', 'Hola, estoy disponible el viernes a la tarde porque a la mañana laburo.', true, '2026-05-19 16:30-03', '2026-05-19 13:46-03', '2026-05-19 13:46-03', '2026-05-19 13:20-03'),
    ('Monoambiente apto crédito en Palermo Hollywood', 'Carolina Mendez', 'carolina@email.com', '1158763311', 'instagram', 'Precalificado', 'Media', 69, 'Consulta por compra para inversion, le interesa renta temporaria y financiacion.', 'Enviar ficha y proponer visita el sabado.', 'compra inversion', 'Venta', 'Palermo Hollywood', '30 dias', 'USD 110.000', 'Busca apto credito y buena renta.', 'Me pasas gastos, expensas y si es apto credito?', true, '2026-05-20 09:00-03', null, '2026-05-18 18:15-03', '2026-05-18 18:00-03'),
    ('Casa familiar en Flores con terraza', 'Paula Ibarra', 'paula.ibarra@email.com', '1166607788', 'web', 'Propuesta', 'Media', 74, 'Familia buscando casa con terraza, ya visito y pidio condiciones para reservar.', 'Enviar pasos para reserva y documentacion.', 'reserva', 'Alquiler', 'Flores', 'junio', '$1.500.000', 'Familia con dos hijos y perro mediano.', 'Nos gusto la casa, que necesitamos para reservar?', true, '2026-05-19 18:00-03', '2026-05-18 19:00-03', '2026-05-19 09:30-03', '2026-05-17 15:00-03'),
    ('Semipiso 4 ambientes en Belgrano R', 'Gaston Uribe', 'gaston@email.com', '1134567890', 'web', 'Nuevo', 'Baja', 48, 'Busca compra, presupuesto por debajo del valor publicado. Requiere calificar mejor.', 'Preguntar presupuesto real y si evalua financiacion.', 'consulta compra', 'Venta', 'Belgrano', 'sin urgencia', 'USD 240.000', 'Quiere cochera y balcon.', 'Esta publicado en USD 285.000? Escuchan oferta?', true, '2026-05-21 12:00-03', null, '2026-05-18 11:10-03', '2026-05-18 11:00-03')
  ) as l(property_title, full_name, email, phone, source, stage, priority, score, summary, reply, intent, operation, location, timeline, budget, requirements, last_message, needs_response, next_follow_up, last_contacted, activity, created)
  join public.properties p on p.title = l.property_title and p.agency_id = v_agency_id;

  for v_lead_id, v_property_id in
    select id, property_id from public.crm_leads where agency_id = v_agency_id and qualification_summary like '[DEMO PROPS]%'
  loop
    insert into public.crm_lead_messages (lead_id, agency_id, property_id, channel, direction, sender_role, content, metadata, created_at)
    values
      (v_lead_id, v_agency_id, v_property_id, 'web', 'incoming', 'customer', 'Hola, vi la propiedad publicada y quiero mas informacion.', '{"demo": true}'::jsonb, now() - interval '3 hours'),
      (v_lead_id, v_agency_id, v_property_id, 'web', 'outgoing', 'assistant', 'Hola, te ayudo. Puedo pasarte requisitos, ubicacion y coordinar visita con la inmobiliaria.', '{"demo": true}'::jsonb, now() - interval '2 hours 55 minutes'),
      (v_lead_id, v_agency_id, v_property_id, 'web', 'incoming', 'customer', 'Me interesa coordinar una visita y saber requisitos.', '{"demo": true}'::jsonb, now() - interval '2 hours 45 minutes'),
      (v_lead_id, v_agency_id, v_property_id, 'web', 'outgoing', 'assistant', 'Perfecto. Te tomo nombre, celular y disponibilidad para que el equipo comercial te contacte.', '{"demo": true}'::jsonb, now() - interval '2 hours 40 minutes');
  end loop;

  for v_lead_id, v_property_id in
    select id, property_id from public.crm_leads
    where agency_id = v_agency_id and qualification_summary like '[DEMO PROPS]%'
    limit 4
  loop
    insert into public.visit_appointments (lead_id, agency_id, property_id, scheduled_for, status, notes, created_by)
    values (v_lead_id, v_agency_id, v_property_id, now() + (floor(random() * 5 + 1) || ' days')::interval, 'Programada', '[DEMO PROPS] Visita creada para mostrar agenda y recordatorios.', v_user_id)
    returning id into v_visit_id;

    insert into public.employee_tasks (agency_id, lead_id, property_id, visit_id, title, details, due_at, task_type, priority, status, automation_source, assigned_user_id, created_by)
    values (v_agency_id, v_lead_id, v_property_id, v_visit_id, 'Confirmar visita con lead demo', '[DEMO PROPS] Confirmar horario, enviar direccion y dejar nota post-visita.', now() + interval '6 hours', 'Visita', 'Alta', 'Pendiente', 'demo_seed', v_user_id, v_user_id);
  end loop;

  insert into public.employee_tasks (agency_id, title, details, due_at, task_type, priority, status, automation_source, assigned_user_id, created_by)
  values
    (v_agency_id, 'Revisar morosos de mayo', '[DEMO PROPS] Hay inquilinos con deuda y punitorios calculados para mostrar el modulo.', now() + interval '2 hours', 'General', 'Alta', 'Pendiente', 'demo_seed', v_user_id, v_user_id),
    (v_agency_id, 'Enviar liquidaciones pendientes', '[DEMO PROPS] Revisar liquidaciones emitidas y transferencias pendientes a propietarios.', now() + interval '1 day', 'General', 'Media', 'Pendiente', 'demo_seed', v_user_id, v_user_id),
    (v_agency_id, 'Publicar fotos nuevas de Belgrano', '[DEMO PROPS] La propiedad de venta necesita destacar mejores ambientes.', now() + interval '2 days', 'General', 'Media', 'Pendiente', 'demo_seed', v_user_id, v_user_id);

  insert into public.contract_rescissions (contract_id, property_id, agency_id, requested_on, effective_date, reason, settlement_terms, status, created_by)
  select id, property_id, agency_id, '2026-05-15', '2026-06-30', '[DEMO PROPS] Inquilino consulta salida anticipada por mudanza laboral.', 'Revisar deposito, servicios y entrega de llaves.', 'En negociacion', v_user_id
  from public.rental_contracts
  where agency_id = v_agency_id and tenant_name = 'Estudio Gamarra SRL'
  limit 1;
end $$;
