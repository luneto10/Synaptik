CREATE TABLE categories (
	id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
	name varchar(255) NOT NULL
);

CREATE TABLE orders (
	id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
	created_at timestamp NOT NULL
);

CREATE TABLE products (
	id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
	name varchar(255) NOT NULL,
	price decimal(10, 2) NOT NULL,
	category_id uuid NOT NULL REFERENCES categories (id)
);

CREATE TABLE order_product (
	order_id uuid NOT NULL REFERENCES orders (id),
	product_id uuid NOT NULL REFERENCES products (id),
	PRIMARY KEY (order_id, product_id)
);