ALTER TABLE orders
ADD COLUMN order_snapshot_id BIGINT UNSIGNED NULL AFTER id,
ADD COLUMN product_type ENUM('reseller', 'consumer', 'partner')
    NOT NULL DEFAULT 'consumer' AFTER order_snapshot_id,
ADD CONSTRAINT fk_orders_order_snapshot
    FOREIGN KEY (order_snapshot_id)
    REFERENCES order_snapshots(id);
    
    
    CREATE TABLE order_snapshots (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    total_amount DECIMAL(18,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'MYR',

    snapshot_data JSON NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);
    
    
    CREATE TABLE product_extra_charges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    product_id BIGINT NOT NULL,

    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    symbol VARCHAR(20) NULL,

    product_type ENUM('CONSUMER', 'PARTNER', 'RESELLER')
        NOT NULL DEFAULT 'CONSUMER',

    calculation_basis ENUM('QUANTITY', 'PRODUCT')
        NOT NULL DEFAULT 'PRODUCT'
        COMMENT 'Whether the charge is calculated per quantity or per product',

    calculation_type ENUM('PERCENTAGE', 'AMOUNT')
        NOT NULL DEFAULT 'AMOUNT'
        COMMENT 'Whether the primary charge is percentage-based or fixed amount',

    amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,

    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    fixed_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,

    fixed_amount_basis ENUM('QUANTITY', 'PRODUCT')
        NULL
        COMMENT 'Whether the fixed amount is applied per quantity or per product',

    waive_at_quantity INT UNSIGNED NULL
        COMMENT 'Charge is waived when quantity reaches this value',

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_product_extra_charges_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE product_add_ons (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    product_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    symbol VARCHAR(20) NULL,

    product_type ENUM('CONSUMER', 'PARTNER', 'RESELLER')
        NOT NULL DEFAULT 'CONSUMER',

    calculation_type ENUM('PERCENTAGE', 'AMOUNT')
        NOT NULL DEFAULT 'AMOUNT'
        COMMENT 'Whether the add-on price is percentage-based or fixed amount',

    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,

    cost_per_unit TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '0 = applied once, 1 = applied for each quantity',

    applicable_minimum_quantity INT UNSIGNED NULL
        COMMENT 'Minimum product quantity required for this add-on',

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_product_add_ons_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE product_coupons (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    product_id BIGINT NOT NULL,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,

    product_type ENUM('CONSUMER', 'PARTNER', 'RESELLER')
        NOT NULL DEFAULT 'CONSUMER',

    discount_type ENUM('PERCENTAGE', 'AMOUNT')
        NOT NULL DEFAULT 'PERCENTAGE',

    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,

    minimum_quantity INT UNSIGNED NULL
        COMMENT 'Minimum product quantity required to use the coupon',

    maximum_discount_amount DECIMAL(18,2) NULL
        COMMENT 'Maximum discount allowed when discount type is percentage',

    usage_limit INT UNSIGNED NULL
        COMMENT 'Maximum number of times this coupon can be used',

    start_at DATETIME NULL,
    end_at DATETIME NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_product_coupons_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE product_discounts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    product_id BIGINT NOT NULL,

    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,

    product_type ENUM('CONSUMER', 'PARTNER', 'RESELLER')
        NOT NULL DEFAULT 'CONSUMER',

    discount_type ENUM('PERCENTAGE', 'AMOUNT')
        NOT NULL DEFAULT 'PERCENTAGE',

    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,

    minimum_quantity INT UNSIGNED NULL
        COMMENT 'Minimum quantity required for discount',

    maximum_discount_amount DECIMAL(18,2) NULL
        COMMENT 'Maximum discount allowed for percentage discount',

    start_at DATETIME NULL,
    end_at DATETIME NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_product_discounts_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


ALTER TABLE users
ADD COLUMN vimas_e_wallet_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
ADD COLUMN vimas_e_wallet_status TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '0 = inactive, 1 = active';
    
    
    CREATE TABLE vimas_e_wallet_transactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT NOT NULL,

    type ENUM(
        'CREDIT',
        'DEBIT',
        'CHECKOUT',
        'REFUND'
    ) NOT NULL,

    amount DECIMAL(18,2) NOT NULL,

    balance_before DECIMAL(18,2) NOT NULL,
    balance_after DECIMAL(18,2) NOT NULL,

    created_by ENUM('USER', 'ADMIN', 'SYSTEM')
        NOT NULL DEFAULT 'SYSTEM',

    description VARCHAR(255) NULL,

    reference_type VARCHAR(50) NULL,
    reference_id BIGINT UNSIGNED NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_vimas_e_wallet_transactions_user_id (user_id),
    INDEX idx_vimas_e_wallet_transactions_reference (reference_type, reference_id),

    CONSTRAINT fk_vimas_e_wallet_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);