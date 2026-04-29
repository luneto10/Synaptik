CREATE TABLE categories (
	id uuid PRIMARY KEY,
	name varchar NOT NULL
);

CREATE TABLE orders (
	id uuid PRIMARY KEY,
	created_at timestamp NOT NULL
);

CREATE TABLE products (
	id uuid PRIMARY KEY,
	name varchar NOT NULL,
	price float NOT NULL,
	category_id uuid NOT NULL REFERENCES categories (id)
);

CREATE TABLE order_product (
	order_id uuid NOT NULL REFERENCES orders (id),
	product_id uuid NOT NULL REFERENCES products (id),
	PRIMARY KEY (order_id, product_id)
);