-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT '📦',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'units',
  min_quantity INTEGER DEFAULT 1,
  location VARCHAR(100),
  purchase_date DATE,
  expiry_date DATE,
  purchase_price DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'ok'
    CHECK (status IN ('ok', 'low', 'out', 'expired')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auto-update updated_at on items
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON items;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-compute status based on quantity vs min_quantity
CREATE OR REPLACE FUNCTION compute_item_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity = 0 THEN NEW.status = 'out';
  ELSIF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < NOW() THEN NEW.status = 'expired';
  ELSIF NEW.quantity <= NEW.min_quantity THEN NEW.status = 'low';
  ELSE NEW.status = 'ok';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compute_status ON items;
CREATE TRIGGER compute_status
BEFORE INSERT OR UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION compute_item_status();

-- Seed: default grocery categories (cloned per user on register)
INSERT INTO categories (user_id, name, icon) VALUES
  (NULL, 'Meat & Seafood', '🥩'),
  (NULL, 'Dairy & Eggs', '🥛'),
  (NULL, 'Fruits & Vegetables', '🥦'),
  (NULL, 'Canned & Jarred Goods', '🥫'),
  (NULL, 'Frozen Foods', '🧊'),
  (NULL, 'Bread & Bakery', '🍞'),
  (NULL, 'Condiments & Sauces', '🧂'),
  (NULL, 'Beverages', '🥤'),
  (NULL, 'Snacks', '🍿'),
  (NULL, 'Grains, Pasta & Rice', '🌾'),
  (NULL, 'Household Essentials', '🧹')
ON CONFLICT DO NOTHING;
