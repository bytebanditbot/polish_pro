CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_eur INTEGER NOT NULL,
  duration_min INTEGER NOT NULL
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  car_model TEXT,
  slot_start TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO services (name, description, price_eur, duration_min) VALUES
  ('Express Polish', 'One-step machine polish that restores gloss and removes light swirls.', 89, 90),
  ('Full Paint Correction', 'Multi-step polish that removes scratches, swirls and oxidation.', 349, 360),
  ('Ceramic Coating', 'Long-lasting protective coating with a deep, glassy finish.', 590, 480),
  ('Interior Deep Clean', 'Full vacuum, steam clean and conditioning of seats and surfaces.', 129, 120);
