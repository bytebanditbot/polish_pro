CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_eur INTEGER NOT NULL,
  duration_min INTEGER NOT NULL
);

CREATE TABLE inquiries (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  car_model TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  archived BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  customer_email_sent BOOLEAN,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE inquiry_replies (
  id SERIAL PRIMARY KEY,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE email_settings (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  notification_email TEXT NOT NULL DEFAULT '',
  smtp_user TEXT,
  smtp_pass_encrypted TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site_content (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO services (name, description, price_eur, duration_min) VALUES
  ('Polissage Express', 'Polissage mécanique en une étape qui redonne de l''éclat et élimine les légères rayures.', 89, 90),
  ('Correction complète de la peinture', 'Polissage en plusieurs étapes pour éliminer les rayures, les traces de swirls et l''oxydation.', 349, 360),
  ('Revêtement céramique', 'Revêtement protecteur durable avec un fini profond et vitreux.', 590, 480),
  ('Nettoyage intérieur profond', 'Aspirateur complet, nettoyage vapeur et traitement des sièges et des surfaces.', 129, 120);
