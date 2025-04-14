-- Add blockchain_sell_order_id column to sell_orders table
ALTER TABLE sell_orders
ADD COLUMN blockchain_sell_order_id INTEGER;

-- Add an index for faster lookups
CREATE INDEX idx_sell_orders_blockchain_id ON sell_orders(blockchain_sell_order_id);

-- Add a constraint to ensure blockchain_sell_order_id is positive
ALTER TABLE sell_orders
ADD CONSTRAINT chk_blockchain_sell_order_id_positive 
CHECK (blockchain_sell_order_id > 0); 