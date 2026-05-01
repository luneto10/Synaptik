CREATE TABLE categories (
	id char(36) DEFAULT (UUID()) PRIMARY KEY,
	name varchar(255) NOT NULL
);

CREATE TABLE orders (
	id char(36) DEFAULT (UUID()) PRIMARY KEY,
	created_at timestamp NOT NULL
);

CREATE TABLE products (
	id char(36) DEFAULT (UUID()) PRIMARY KEY,
	name varchar(255) NOT NULL,
	price decimal(10, 2) NOT NULL,
	category_id char(36) NOT NULL REFERENCES categories (id)
);

CREATE TABLE order_product (
	order_id char(36) NOT NULL REFERENCES orders (id),
	product_id char(36) NOT NULL REFERENCES products (id),
	PRIMARY KEY (order_id, product_id)
);