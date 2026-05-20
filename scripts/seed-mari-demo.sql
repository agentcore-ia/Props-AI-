-- Seed a complete demo agency for mari@demo.com.
-- Create/confirm the Auth user through Supabase Auth first, then run this script.
-- This script is idempotent: it recreates the demo agency data and links it to the Auth user.

do $$
declare
  v_user_id uuid;
  v_agency_id uuid;
  p_balvanera uuid;
  p_caballito uuid;
  p_palermo uuid;
  p_urquiza uuid;
  p_nunez uuid;
  p_microcentro uuid;
  p_belgrano uuid;
  p_saavedra uuid;
  p_palermo_mono uuid;
  p_chacarita uuid;
  p_almagro uuid;
  p_colegiales uuid;
  c_balvanera uuid;
  c_caballito uuid;
  c_palermo uuid;
  c_urquiza uuid;
  c_nunez uuid;
  c_microcentro uuid;
  o_owner uuid;
  s_settlement uuid;
  s_supplier uuid;
  l1 uuid;
  l2 uuid;
  l3 uuid;
  l4 uuid;
  l5 uuid;
  v_visit uuid;
  m_id uuid;
begin
  delete from public.agencies
  where slug = 'demo-urbana'
     or email = 'mari@demo.com'
     or owner_email = 'mari@demo.com';

  select id into v_user_id
  from auth.users
  where lower(email) = lower('mari@demo.com')
  limit 1;

  if v_user_id is null then
    raise exception 'Create the Auth user mari@demo.com with password demo123 before running this seed.';
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = raw_user_meta_data || '{"full_name":"Mariana Demo","phone":"1133445566","email_verified":true}'::jsonb,
      updated_at = now()
  where id = v_user_id;

  insert into public.profiles (id, email, full_name, phone, role, agency_slug, updated_at)
  values (v_user_id, 'mari@demo.com', 'Mariana Demo', '1133445566', 'agency_admin', 'demo-urbana', now())
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      phone = excluded.phone,
      role = excluded.role,
      agency_slug = excluded.agency_slug,
      updated_at = now();

  insert into public.agencies (
    auth_user_id, name, slug, email, phone, owner_name, owner_email, plan, status, city,
    tagline, messaging_instance, whatsapp_ai_enabled, business_hours, website_url, instagram_url
  )
  values (
    v_user_id, 'Demo Urbana Propiedades', 'demo-urbana', 'mari@demo.com', '011 4567-8901',
    'Mariana Demo', 'mari@demo.com', 'Scale', 'Activa', 'CABA',
    'Gestion inmobiliaria simple, con automatizaciones y datos listos para operar.',
    'props-demo-urbana', true,
    'Lunes a viernes de 9 a 18 hs. Sabados de 10 a 13 hs.',
    'https://props.com.ar/inmobiliaria/demo-urbana',
    'https://instagram.com/demourbanaprop'
  )
  returning id into v_agency_id;

  insert into public.properties (
    agency_id, title, price, currency, location, exact_address, status, operation, description,
    image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished,
    expenses, expenses_currency, available_from, pets_policy, requirements, amenities,
    publish_marketplace, created_by
  )
  values
    (v_agency_id, 'Depto 2 ambientes en Balvanera', 700000, 'ARS', 'Balvanera, CABA', 'Av. Rivadavia 2700, Balvanera, CABA', 'Disponible', 'Alquiler', 'Departamento de 2 ambientes con balcon, cocina separada y muy buena conexion con subte y colectivos.',
     'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'),
     'Departamento', 1, 1, 45, 0, false, 110000, 'ARS', '2026-06-01', 'Acepta mascota chica con compromiso de mantenimiento.', 'Seguro de caucion o garantia familiar, recibos de sueldo y deposito.', jsonb_build_array('Balcon','Subte cercano','Muy luminoso'), true, v_user_id)
  returning id into p_balvanera;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Monoambiente en Caballito', 580000, 'ARS', 'Caballito, CABA', 'Rosario 732, Caballito, CABA', 'Disponible', 'Alquiler', 'Monoambiente amplio con balcon, placard, cocina integrada y amenities en edificio moderno.',
     'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=80'),
     'Departamento', 0, 1, 38, 0, true, 85000, 'ARS', '2026-06-15', 'Mascotas a consultar.', 'Ingresos comprobables, seguro de caucion y mes de deposito.', jsonb_build_array('Balcon','Laundry','SUM'), true, v_user_id)
  returning id into p_caballito;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, '3 ambientes con balcon en Palermo', 1200000, 'ARS', 'Palermo, CABA', 'Pringles 1100, Palermo, CABA', 'Disponible', 'Alquiler', 'Tres ambientes con balcon corrido, dormitorio principal en suite, cocina independiente y excelente luz.',
     'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1560448204-61dc36dc98c8?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80'),
     'Departamento', 2, 2, 72, 1, false, 180000, 'ARS', '2026-06-01', 'Acepta mascotas pequenas.', 'Garantia propietaria CABA o seguro de caucion, demostracion de ingresos.', jsonb_build_array('Balcon','Cochera','Cocina independiente'), true, v_user_id)
  returning id into p_palermo;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'PH con patio en Villa Urquiza', 920000, 'ARS', 'Villa Urquiza, CABA', 'Combatientes de Malvinas 4200, Villa Urquiza, CABA', 'Disponible', 'Alquiler', 'PH de tres ambientes con patio propio, parrilla y escritorio. Ideal familia chica.',
     'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80'),
     'PH', 2, 1, 88, 0, false, 0, 'ARS', '2026-06-10', 'Acepta perro chico.', 'Garantia propietaria o caucion, dos recibos y deposito.', jsonb_build_array('Patio','Parrilla','Sin expensas'), true, v_user_id)
  returning id into p_urquiza;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Depto luminoso en Nunez', 640000, 'ARS', 'Nunez, CABA', 'Vuelta de Obligado 3400, Nunez, CABA', 'Disponible', 'Alquiler', 'Dos ambientes al frente, living con salida a balcon y dormitorio con placard.',
     'https://images.unsplash.com/photo-1560448075-bb485b067938?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1560448075-bb485b067938?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80'),
     'Departamento', 1, 1, 42, 0, false, 92000, 'ARS', '2026-06-05', 'Mascotas a consultar.', 'Seguro de caucion, recibos y deposito.', jsonb_build_array('Balcon','Cercania tren','Bajas expensas'), true, v_user_id)
  returning id into p_nunez;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Oficina al frente en Microcentro', 480000, 'ARS', 'Microcentro, CABA', 'Tucuman 900, Microcentro, CABA', 'Disponible', 'Alquiler', 'Oficina profesional con recepcion, dos despachos y kitchenette.',
     'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80'),
     'Oficina', 0, 1, 52, 0, false, 74000, 'ARS', '2026-06-01', '', 'Garantia comercial o seguro, ingresos demostrables.', jsonb_build_array('Recepcion','Kitchinette','Subte cercano'), true, v_user_id)
  returning id into p_microcentro;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Departamento con balcon en Belgrano', 760000, 'ARS', 'Belgrano, CABA', 'Mendoza 1800, Belgrano, CABA', 'Disponible', 'Alquiler', 'Dos ambientes en torre con seguridad, balcon y pileta.',
     'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1560440021-33f9b867899d?auto=format&fit=crop&w=1200&q=80'),
     'Departamento', 1, 1, 50, 1, false, 130000, 'ARS', '2026-06-20', 'Acepta gato.', 'Seguro de caucion, demostracion de ingresos.', jsonb_build_array('Pileta','Seguridad','Cochera opcional'), true, v_user_id)
  returning id into p_belgrano;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Casa familiar en Saavedra', 245000, 'USD', 'Saavedra, CABA', 'Pico 4300, Saavedra, CABA', 'Disponible', 'Venta', 'Casa de cuatro ambientes con jardin, quincho y cochera cubierta.',
     'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'),
     'Casa', 3, 2, 150, 1, false, null, null, null, '', '', jsonb_build_array('Jardin','Quincho','Cochera'), true, v_user_id)
  returning id into p_saavedra;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Monoambiente amoblado en Palermo Soho', 690000, 'ARS', 'Palermo Soho, CABA', 'Gurruchaga 1700, Palermo Soho, CABA', 'Disponible', 'Alquiler', 'Unidad amoblada lista para ingresar, balcon frances y excelente entorno gastronomico.',
     'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'),
     'Departamento', 0, 1, 34, 0, true, 95000, 'ARS', '2026-06-01', 'No acepta mascotas.', 'Contrato temporario o tradicional segun perfil.', jsonb_build_array('Amoblado','Aire acondicionado','Palermo Soho'), true, v_user_id)
  returning id into p_palermo_mono;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Loft en Chacarita con terraza', 138000, 'USD', 'Chacarita, CABA', 'Charlone 900, Chacarita, CABA', 'Disponible', 'Venta', 'Loft moderno en duplex, terraza propia y vista abierta.',
     'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'),
     'Loft', 1, 1, 62, 0, false, 70000, 'ARS', null, '', '', jsonb_build_array('Terraza','Duplex','Apto credito'), true, v_user_id)
  returning id into p_chacarita;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Departamento 2 ambientes en Almagro', 620000, 'ARS', 'Almagro, CABA', 'Medrano 650, Almagro, CABA', 'Disponible', 'Alquiler', 'Dos ambientes reciclado, cocina integrada, balcon y conexion rapida al subte B.',
     'https://images.unsplash.com/photo-1560448204-61dc36dc98c8?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1560448204-61dc36dc98c8?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1200&q=80'),
     'Departamento', 1, 1, 44, 0, false, 98000, 'ARS', '2026-06-12', 'Acepta gato.', 'Seguro de caucion y recibos de sueldo.', jsonb_build_array('Balcon','Subte B','Reciclado'), true, v_user_id)
  returning id into p_almagro;

  insert into public.properties (agency_id, title, price, currency, location, exact_address, status, operation, description, image, images, property_type, bedrooms, bathrooms, area, parking_spots, furnished, expenses, expenses_currency, available_from, pets_policy, requirements, amenities, publish_marketplace, created_by)
  values
    (v_agency_id, 'Local comercial en Colegiales', 980000, 'ARS', 'Colegiales, CABA', 'Federico Lacroze 3100, Colegiales, CABA', 'Disponible', 'Alquiler', 'Local a la calle con vidriera, deposito y bano. Zona de alto transito.',
     'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1200&q=80',
     jsonb_build_array('https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1200&q=80','https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80'),
     'Local', 0, 1, 76, 0, false, 120000, 'ARS', '2026-06-01', '', 'Garantia comercial, demostracion de actividad y deposito.', jsonb_build_array('Vidriera','Deposito','A la calle'), true, v_user_id)
  returning id into p_colegiales;

  insert into public.rental_contracts (property_id, agency_id, tenant_name, tenant_phone, tenant_email, current_rent, index_type, adjustment_frequency_months, late_fee_daily_amount, late_fee_grace_days, contract_start_date, rent_reference_date, next_adjustment_date, last_adjustment_date, auto_notify, status, notes, owner_name, owner_phone, owner_email, management_fee_percent, monthly_owner_costs, created_by)
  values
    (p_balvanera, v_agency_id, 'Luis Ramirez', '23466847022', 'luis.ramirez@email.com', 700000, 'ICL', 4, 10000, 10, '2026-01-01', '2026-01-01', '2026-05-22', null, true, 'Activo', 'Contrato con ajuste cuatrimestral por ICL. Cliente consulta seguido por WhatsApp.', 'Silvia Suarez', '1144556677', 'silvia.suarez@email.com', 5, 18000, v_user_id),
    (p_caballito, v_agency_id, 'Sofia Molina', '1166778899', 'sofia.molina@email.com', 580000, 'IPC', 3, 0, 10, '2026-02-01', '2026-02-01', '2026-05-01', '2026-05-01', true, 'Activo', 'Aumento aplicado en mayo. Pendiente revisar comprobante parcial.', 'Jorge Costa', '1133224455', 'jorge.costa@email.com', 5, 12000, v_user_id),
    (p_palermo, v_agency_id, 'Carlos Benitez', '1144889900', 'carlos.benitez@email.com', 1200000, 'IPC', 3, 15000, 10, '2026-03-01', '2026-03-01', '2026-06-01', null, true, 'Activo', 'Cliente con buen historial. Tiene visita de mantenimiento pendiente.', 'Ana Ferreyra', '1155007788', 'ana.ferreyra@email.com', 4, 25000, v_user_id),
    (p_urquiza, v_agency_id, 'Agustina Rivas', '1177889900', 'agustina.rivas@email.com', 920000, 'ICL', 4, 12000, 10, '2026-01-10', '2026-01-10', '2026-05-10', null, true, 'Activo', 'Debe enviar comprobante de pago. Se sugirio aviso firme.', 'Roberto Diaz', '1166554433', 'roberto.diaz@email.com', 5, 0, v_user_id),
    (p_nunez, v_agency_id, 'Mariano Carrizo', '1133448899', 'mariano.carrizo@email.com', 640000, 'IPC', 3, 10000, 10, '2026-04-01', '2026-04-01', '2026-07-01', null, true, 'Activo', 'Contrato nuevo. Primer mes abonado por transferencia.', 'Laura Medina', '1155667788', 'laura.medina@email.com', 5, 9000, v_user_id),
    (p_microcentro, v_agency_id, 'Estudio Contable Norte', '1122334455', 'contacto@ecnorte.com', 480000, 'IPC', 6, 8000, 10, '2025-12-01', '2025-12-01', '2026-06-01', null, true, 'Activo', 'Contrato comercial. Enviar recordatorio antes de vencimiento.', 'Daniel Piazza', '1144668800', 'daniel.piazza@email.com', 6, 15000, v_user_id);

  select id into c_balvanera from public.rental_contracts where property_id = p_balvanera;
  select id into c_caballito from public.rental_contracts where property_id = p_caballito;
  select id into c_palermo from public.rental_contracts where property_id = p_palermo;
  select id into c_urquiza from public.rental_contracts where property_id = p_urquiza;
  select id into c_nunez from public.rental_contracts where property_id = p_nunez;
  select id into c_microcentro from public.rental_contracts where property_id = p_microcentro;

  insert into public.rental_contract_owners (contract_id, property_id, agency_id, full_name, email, phone, participation_percent, bank_alias, bank_account, notes, display_order, created_by)
  select id, property_id, agency_id, owner_name, owner_email, owner_phone, 100, lower(replace(owner_name, ' ', '.')) || '.demo', 'CBU demo ' || right(id::text, 8), 'Propietario demo con liquidacion automatica.', 1, v_user_id
  from public.rental_contracts
  where agency_id = v_agency_id;

  insert into public.rental_collections (contract_id, property_id, agency_id, collection_month, expected_rent, collected_amount, payment_method, payment_date, status, notes, receipt_number, created_by)
  values
    (c_balvanera, p_balvanera, v_agency_id, '2026-05', 700000, 0, 'Transferencia', null, 'Mora', 'Mora demo: falta pago y corresponde aviso automatico.', null, v_user_id),
    (c_balvanera, p_balvanera, v_agency_id, '2026-04', 700000, 700000, 'Transferencia', '2026-04-08', 'Cobrada', 'Pago confirmado.', 'RC-202604-LR', v_user_id),
    (c_caballito, p_caballito, v_agency_id, '2026-05', 580000, 300000, 'Transferencia', '2026-05-12', 'Parcial', 'Pago parcial: reclamar saldo.', 'RC-202605-SM', v_user_id),
    (c_palermo, p_palermo, v_agency_id, '2026-05', 1200000, 1200000, 'Transferencia', '2026-05-06', 'Cobrada', 'Pago en termino.', 'RC-202605-CB', v_user_id),
    (c_urquiza, p_urquiza, v_agency_id, '2026-05', 920000, 0, 'Transferencia', null, 'Mora', 'Mora con punitorios diarios.', null, v_user_id),
    (c_nunez, p_nunez, v_agency_id, '2026-05', 640000, 640000, 'Transferencia', '2026-05-05', 'Cobrada', 'Primer pago registrado.', 'RC-202605-MC', v_user_id),
    (c_microcentro, p_microcentro, v_agency_id, '2026-05', 480000, 480000, 'Transferencia', '2026-05-10', 'Cobrada', 'Pago comercial confirmado.', 'RC-202605-ECN', v_user_id);

  for o_owner in
    select id from public.rental_contract_owners where agency_id = v_agency_id
  loop
    insert into public.owner_settlements (
      contract_id, property_id, agency_id, contract_owner_id, participation_percent, settlement_month,
      owner_name, owner_email, owner_phone, rent_collected, management_fee_percent,
      management_fee_amount, monthly_owner_costs, other_charges_amount, other_charges_detail,
      owner_payout_amount, status, sent_at, paid_at, settlement_number, created_by
    )
    select
      rco.contract_id, rco.property_id, rco.agency_id, rco.id, rco.participation_percent, '2026-05',
      rco.full_name, rco.email, rco.phone, rc.collected_amount, coalesce(ct.management_fee_percent, 5),
      round(rc.collected_amount * coalesce(ct.management_fee_percent, 5) / 100, 2),
      coalesce(ct.monthly_owner_costs, 0), 0, '',
      greatest(rc.collected_amount - round(rc.collected_amount * coalesce(ct.management_fee_percent, 5) / 100, 2) - coalesce(ct.monthly_owner_costs, 0), 0),
      case when rc.status = 'Cobrada' then 'Emitida' else 'Borrador' end,
      case when rc.status = 'Cobrada' then now() - interval '1 day' else null end,
      null,
      'LP-202605-' || upper(left(replace(rco.full_name, ' ', ''), 3)),
      v_user_id
    from public.rental_contract_owners rco
    join public.rental_contracts ct on ct.id = rco.contract_id
    join public.rental_collections rc on rc.contract_id = ct.id and rc.collection_month = '2026-05'
    where rco.id = o_owner;
  end loop;

  insert into public.owner_transfers (settlement_id, contract_id, property_id, agency_id, owner_name, amount, transfer_number, destination_label, transfer_date, status, notes, created_by)
  select id, contract_id, property_id, agency_id, owner_name, owner_payout_amount, 'TR-' || right(id::text, 6), coalesce(owner_email, owner_phone, 'Cuenta pendiente'), current_date + 1, 'Programada', 'Transferencia preparada desde liquidacion demo.', v_user_id
  from public.owner_settlements
  where agency_id = v_agency_id and status = 'Emitida';

  insert into public.rental_adjustments (
    contract_id, property_id, agency_id, index_type, applied_on, reference_start_date,
    reference_end_date, factor, previous_rent, new_rent, source_label, source_snapshot,
    message_body, notification_status, notified_at
  )
  values
    (c_caballito, p_caballito, v_agency_id, 'IPC', '2026-05-01', '2026-02-01', '2026-05-01', 1.1154, 520000, 580000, 'Calculo por indice oficial', '{"demo":true,"source":"IPC"}', 'Hola Sofia, desde mayo el alquiler actualizado es $580.000 segun IPC.', 'Enviado', now() - interval '5 days'),
    (c_balvanera, p_balvanera, v_agency_id, 'ICL', '2026-05-22', '2026-01-01', '2026-05-22', 1.1200, 625000, 700000, 'Calculo por indice oficial', '{"demo":true,"source":"ICL"}', 'Hola Luis, el proximo ajuste por ICL queda pendiente de calcular con el indice oficial del periodo.', 'Pendiente', null),
    (c_palermo, p_palermo, v_agency_id, 'IPC', '2026-06-01', '2026-03-01', '2026-06-01', 1.1185, 1072865, 1200000, 'Calculo por indice oficial', '{"demo":true,"source":"IPC"}', 'Hola Carlos, en junio corresponde actualizar el alquiler segun IPC.', 'Pendiente', null);

  insert into public.cash_movements (agency_id, occurred_on, kind, category, amount, movement_number, reference, notes, created_by)
  values
    (v_agency_id, current_date - 4, 'Ingreso', 'Cobranza alquiler', 1200000, 'CJ-0001', 'Carlos Benitez mayo', 'Pago recibido por transferencia.', v_user_id),
    (v_agency_id, current_date - 3, 'Ingreso', 'Cobranza alquiler', 640000, 'CJ-0002', 'Mariano Carrizo mayo', 'Pago recibido.', v_user_id),
    (v_agency_id, current_date - 2, 'Ingreso', 'Honorarios administracion', 60000, 'CJ-0003', 'Honorarios Palermo', 'Retencion por administracion.', v_user_id),
    (v_agency_id, current_date - 2, 'Egreso', 'Proveedor', 45000, 'CJ-0004', 'Cerrajeria Urquiza', 'Cambio de cerradura solicitado por propietario.', v_user_id),
    (v_agency_id, current_date - 1, 'Transferencia', 'Liquidacion propietario', 1107000, 'CJ-0005', 'Ana Ferreyra', 'Liquidacion programada.', v_user_id),
    (v_agency_id, current_date, 'Egreso', 'Publicidad', 78000, 'CJ-0006', 'Anuncios marketplace', 'Campana para propiedades destacadas.', v_user_id);

  insert into public.suppliers (agency_id, name, service_type, contact_name, phone, email, notes, status, created_by)
  values
    (v_agency_id, 'Cerrajeria Norte', 'Cerrajeria', 'Pablo Ruiz', '1144001122', 'cerrajeria@norte.com', 'Atiende urgencias en CABA.', 'Activo', v_user_id),
    (v_agency_id, 'Plomeria Express', 'Plomeria', 'Martin Vera', '1166007788', 'plomeria@express.com', 'Proveedor recomendado para consorcios.', 'Activo', v_user_id),
    (v_agency_id, 'Fotos Urbanas', 'Fotografia inmobiliaria', 'Camila Soto', '1177009900', 'hola@fotosurbanas.com', 'Fotos y video para publicaciones.', 'Activo', v_user_id);

  insert into public.supplier_invoices (agency_id, supplier_id, invoice_number, concept, total_amount, due_date, status, notes, created_by)
  select v_agency_id, id, 'FC-' || row_number() over (), case when service_type = 'Cerrajeria' then 'Cambio de cerradura PH Urquiza' when service_type = 'Plomeria' then 'Revision perdida bano Palermo' else 'Fotos departamento Belgrano' end, case when service_type = 'Fotografia inmobiliaria' then 65000 else 45000 end, current_date + 7, 'Emitida', 'Factura demo para seguimiento operativo.', v_user_id
  from public.suppliers
  where agency_id = v_agency_id;

  insert into public.agency_message_templates (agency_id, template_key, label, body)
  values
    (v_agency_id, 'rental_requirements', 'Requisitos de alquiler', 'Para avanzar pedimos DNI, comprobantes de ingresos, garantia o seguro de caucion y deposito. Props adapta este texto segun la propiedad.'),
    (v_agency_id, 'sale_reply', 'Respuesta para venta', 'Gracias por consultar. Te paso precio, ubicacion y coordinamos visita si la propiedad encaja con lo que buscas.'),
    (v_agency_id, 'follow_up', 'Seguimiento comercial', 'Hola, retomo tu consulta para saber si queres avanzar o ver opciones similares.'),
    (v_agency_id, 'visit_confirmation', 'Confirmacion de visita', 'Confirmamos la visita para la propiedad. Te esperamos en el horario acordado.'),
    (v_agency_id, 'gentle_rejection', 'Cierre amable', 'Gracias por avisarnos. Si mas adelante buscas otra propiedad, quedamos atentos.')
  on conflict (agency_id, template_key) do update set label = excluded.label, body = excluded.body, updated_at = now();

  insert into public.crm_leads (agency_id, property_id, full_name, email, phone, source, stage, priority, score, qualification_summary, ai_reply_draft, intent, desired_operation, desired_location, desired_timeline, budget, requirements_summary, last_customer_message, needs_response, next_follow_up_at, last_contacted_at, owner_user_id)
  values
    (v_agency_id, p_belgrano, 'Paula Fernandez', 'paula@email.com', '1133887766', 'whatsapp', 'Visita', 'Alta', 88, 'Tiene presupuesto, acepta seguro de caucion y pidio visitar Belgrano esta semana.', 'Confirmar dia y horario para la visita en Belgrano.', 'Coordinar visita', 'Alquiler', 'Belgrano', 'Esta semana', 'Hasta ARS 850.000', 'Busca balcon y acepta gato.', 'Me queda bien el jueves despues de las 18.', true, now() + interval '2 hours', now() - interval '1 hour', v_user_id),
    (v_agency_id, p_saavedra, 'Nicolas Herrera', 'nicolas@email.com', '1155332211', 'web', 'Precalificado', 'Media', 74, 'Busca comprar casa familiar. Tiene credito preaprobado y quiere comparar Saavedra/Nunez.', 'Enviar ficha y proponer llamada corta.', 'Compra vivienda', 'Venta', 'Saavedra o Nunez', '60 dias', 'Hasta USD 260.000', 'Necesita jardin y cochera.', 'Tenes algo con jardin y cochera?', true, now() + interval '1 day', now() - interval '4 hours', v_user_id),
    (v_agency_id, p_palermo_mono, 'Lucia Castro', 'lucia@email.com', '1166441199', 'instagram', 'Seguimiento', 'Media', 69, 'Consulta por monoambiente amoblado en Palermo. Falta confirmar si busca temporario o tradicional.', 'Preguntar plazo de contrato y fecha de ingreso.', 'Consulta alquiler', 'Alquiler', 'Palermo', 'Junio', 'Hasta ARS 750.000', 'Quiere amoblado y buena luz.', 'Sigue disponible el monoambiente?', true, now() + interval '5 hours', now() - interval '2 hours', v_user_id),
    (v_agency_id, p_almagro, 'Federico Silva', 'fede@email.com', '1177112200', 'whatsapp', 'Nuevo', 'Alta', 82, 'Tiene urgencia por mudanza, presupuesto acorde y acepta requisitos.', 'Pasar requisitos y ofrecer visita.', 'Mudanza urgente', 'Alquiler', 'Almagro', 'Antes de fin de mes', 'Hasta ARS 700.000', 'Acepta seguro de caucion.', 'Necesito entrar antes del 30.', true, now() + interval '3 hours', null, v_user_id),
    (v_agency_id, p_chacarita, 'Romina Vidal', 'romina@email.com', '1144773322', 'web', 'Propuesta', 'Baja', 58, 'Busca inversion, le interesa terraza pero esta comparando precio.', 'Enviar comparativa y destacar potencial de renta.', 'Inversion', 'Venta', 'Chacarita', 'Sin apuro', 'Hasta USD 150.000', 'Quiere buena renta futura.', 'Me pasas mas info del loft?', false, now() + interval '3 days', now() - interval '1 day', v_user_id);

  select id into l1 from public.crm_leads where agency_id = v_agency_id and full_name = 'Paula Fernandez';
  select id into l2 from public.crm_leads where agency_id = v_agency_id and full_name = 'Nicolas Herrera';
  select id into l3 from public.crm_leads where agency_id = v_agency_id and full_name = 'Lucia Castro';
  select id into l4 from public.crm_leads where agency_id = v_agency_id and full_name = 'Federico Silva';
  select id into l5 from public.crm_leads where agency_id = v_agency_id and full_name = 'Romina Vidal';

  insert into public.crm_lead_messages (lead_id, agency_id, property_id, channel, direction, sender_role, content, metadata, created_at)
  values
    (l1, v_agency_id, p_belgrano, 'whatsapp', 'incoming', 'customer', 'Hola, quiero visitar el departamento de Belgrano. Tengo gato y seguro de caucion.', '{"intent":"visit"}', now() - interval '3 hours'),
    (l1, v_agency_id, p_belgrano, 'whatsapp', 'outgoing', 'assistant', 'Si, Paula. La propiedad acepta gato y podemos coordinar visita. Te propongo jueves o viernes por la tarde.', '{"ai":true}', now() - interval '2 hours'),
    (l1, v_agency_id, p_belgrano, 'whatsapp', 'incoming', 'customer', 'Me queda bien el jueves despues de las 18.', '{}', now() - interval '1 hour'),
    (l2, v_agency_id, p_saavedra, 'web', 'incoming', 'customer', 'Busco casa con jardin y cochera para comprar. Tengo credito preaprobado.', '{}', now() - interval '5 hours'),
    (l2, v_agency_id, p_saavedra, 'web', 'outgoing', 'assistant', 'La casa de Saavedra encaja por jardin, cochera y presupuesto. Te paso ficha y coordinamos una llamada corta.', '{"ai":true}', now() - interval '4 hours'),
    (l3, v_agency_id, p_palermo_mono, 'instagram', 'incoming', 'customer', 'Sigue disponible el monoambiente amoblado?', '{}', now() - interval '2 hours'),
    (l4, v_agency_id, p_almagro, 'whatsapp', 'incoming', 'customer', 'Necesito entrar antes del 30 y tengo seguro de caucion.', '{}', now() - interval '1 hour'),
    (l4, v_agency_id, p_almagro, 'whatsapp', 'outgoing', 'assistant', 'Perfecto Federico. La propiedad esta disponible para junio. Te paso requisitos y coordinamos visita.', '{"ai":true}', now() - interval '50 minutes'),
    (l5, v_agency_id, p_chacarita, 'web', 'incoming', 'customer', 'Me pasas mas info del loft con terraza?', '{}', now() - interval '1 day');

  insert into public.visit_appointments (lead_id, agency_id, property_id, scheduled_for, status, notes, reminder_sent_at, created_by)
  values
    (l1, v_agency_id, p_belgrano, '2026-05-21 18:30:00-03', 'Confirmada', 'Paula visita Belgrano. Llevar ficha y requisitos.', null, v_user_id),
    (l4, v_agency_id, p_almagro, '2026-05-22 10:30:00-03', 'Programada', 'Federico quiere resolver antes de fin de mes.', null, v_user_id)
  ;

  select id into v_visit
  from public.visit_appointments
  where agency_id = v_agency_id and lead_id = l4
  limit 1;

  insert into public.employee_tasks (agency_id, lead_id, property_id, visit_id, title, details, due_at, task_type, priority, status, automation_source, assigned_user_id, created_by)
  values
    (v_agency_id, l1, p_belgrano, null, 'Confirmar visita de Paula', 'Confirmar horario jueves 18:30 y enviar ubicacion.', '2026-05-20 17:00:00-03', 'Visita', 'Alta', 'Pendiente', 'demo-seed', v_user_id, v_user_id),
    (v_agency_id, l4, p_almagro, v_visit, 'Enviar requisitos a Federico', 'Lead urgente con fecha de mudanza cercana.', '2026-05-20 18:00:00-03', 'Responder', 'Alta', 'Pendiente', 'demo-seed', v_user_id, v_user_id),
    (v_agency_id, null, p_balvanera, null, 'Avisar mora a Luis Ramirez', 'Debe alquiler de mayo. Preparar aviso por WhatsApp con punitorios.', '2026-05-20 16:00:00-03', 'Seguimiento', 'Alta', 'Pendiente', 'demo-seed', v_user_id, v_user_id),
    (v_agency_id, null, p_urquiza, null, 'Revisar mora de Agustina Rivas', 'Mora activa. Verificar si envio comprobante antes de insistir.', '2026-05-21 11:00:00-03', 'Seguimiento', 'Media', 'Pendiente', 'demo-seed', v_user_id, v_user_id),
    (v_agency_id, null, p_palermo, null, 'Coordinar plomero en Palermo', 'Proveedor Plomeria Express revisa perdida de bano.', '2026-05-21 09:30:00-03', 'General', 'Media', 'Pendiente', 'demo-seed', v_user_id, v_user_id),
    (v_agency_id, null, p_nunez, null, 'Liquidar a Laura Medina', 'Cobranza confirmada. Liquidacion lista para transferir.', '2026-05-20 19:00:00-03', 'General', 'Media', 'Pendiente', 'demo-seed', v_user_id, v_user_id);

  insert into public.client_memory_profiles (agency_id, display_name, normalized_phone, email, summary, facts, preferences, tags)
  values
    (v_agency_id, 'Luis Ramirez', '23466847022', 'luis.ramirez@email.com', 'Inquilino del departamento de Balvanera. Consulta por vencimientos, aumentos ICL y pagos mensuales.', '{"role":"tenant","current_rent":700000,"property":"Depto 2 ambientes en Balvanera"}', '{"channel":"whatsapp","tone":"directo"}', array['inquilino','alquiler','balvanera']),
    (v_agency_id, 'Paula Fernandez', '1133887766', 'paula@email.com', 'Lead de alquiler en Belgrano. Tiene gato, seguro de caucion y quiere visita esta semana.', '{"role":"lead","stage":"visita"}', '{"zone":"Belgrano","budget":"850000","pet":"gato"}', array['lead','visita','whatsapp']),
    (v_agency_id, 'Silvia Suarez', '1144556677', 'silvia.suarez@email.com', 'Propietaria de Balvanera. Recibe liquidaciones y transferencias mensuales.', '{"role":"owner","property":"Balvanera","fee_percent":5}', '{"prefers":"email y WhatsApp"}', array['propietario','liquidacion'])
  on conflict do nothing;
end $$;
