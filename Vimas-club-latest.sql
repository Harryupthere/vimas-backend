CREATE TABLE point_distributions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    symbol VARCHAR(30) NULL,
    colour VARCHAR(30) NULL,

    event_type ENUM(
        'BUY_PRODUCT',
        'SELL_PRODUCT',
        'REFERRAL',
        'POOL_DISTRIBUTION',
        'ADMIN_ADJUSTMENT',
        'BONUS',
        'REFUND',
        'OTHER'
    ) NOT NULL,

    receiver_type ENUM(
        'BUYER',
        'MERCHANT',
        'UPLINE_LEVEL_1',
        'UPLINE_LEVEL_2',
        'POOL',
        'ADMIN'
    ) NOT NULL,

    points DECIMAL(18,4) NOT NULL DEFAULT 0,

    priority INT NOT NULL DEFAULT 1,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY(id)
);

CREATE TABLE point_user_balances (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT NOT NULL UNIQUE,

    total_credit DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_debit DECIMAL(18,4) NOT NULL DEFAULT 0,
    current_balance DECIMAL(18,4) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY(id),

    CONSTRAINT fk_point_user_balance_user
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE point_admin_balances (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    admin_id BIGINT  NOT NULL UNIQUE,

    total_credit DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_debit DECIMAL(18,4) NOT NULL DEFAULT 0,
    current_balance DECIMAL(18,4) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY(id),

    CONSTRAINT fk_point_admin_balance_admin
    FOREIGN KEY(admin_id) REFERENCES admins(id)
);

CREATE TABLE point_pool_details (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    type ENUM(
        'hourly',
        'daily',
        'weekly',
        'monthly',
        'quarterly',
        'half_yearly',
        'yearly'
    ) NOT NULL,

    name VARCHAR(100) NOT NULL,

    description TEXT,

    symbol VARCHAR(30),

    colour VARCHAR(30),

    status ENUM('active','inactive') DEFAULT 'active',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY(id)

);

CREATE TABLE point_pools (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    pool_detail_id BIGINT UNSIGNED NOT NULL,

    from_datetime DATETIME NOT NULL,

    to_datetime DATETIME NOT NULL,

    total_users INT DEFAULT 0,

    total_admins INT DEFAULT 0,

    total_credit DECIMAL(18,4) DEFAULT 0,

    total_debit DECIMAL(18,4) DEFAULT 0,

    current_balance DECIMAL(18,4) DEFAULT 0,

    distributed_points DECIMAL(18,4) DEFAULT 0,

    status ENUM(
        'active',
        'inactive',
        'completed',
        'cancelled'
    ) DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY(id),

    CONSTRAINT fk_pool_detail
    FOREIGN KEY(pool_detail_id)
    REFERENCES point_pool_details(id)

);

CREATE TABLE point_transactions (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    wallet_type ENUM(
        'USER',
        'ADMIN',
        'POOL'
    ) NOT NULL,

    wallet_id BIGINT UNSIGNED NOT NULL,

    transaction_type ENUM(
        'CREDIT',
        'DEBIT'
    ) NOT NULL,

    transaction_reason ENUM(

        'BUY_PRODUCT',

        'SELL_PRODUCT',

        'PURCHASE_REWARD',

        'REFERRAL_LEVEL_1',

        'REFERRAL_LEVEL_2',

        'POOL_CONTRIBUTION',

        'POOL_DISTRIBUTION',

        'PRODUCT_PURCHASE',

        'ADMIN_ADJUSTMENT',

        'BONUS',

        'REFUND',

        'EXPIRE',

        'OTHER'

    ) NOT NULL,

    source_user_id BIGINT  NULL,

    source_admin_id BIGINT  NULL,

    product_id BIGINT UNSIGNED NULL,

    order_id BIGINT UNSIGNED NULL,

    point_distribution_id BIGINT UNSIGNED NULL,

    pool_id BIGINT UNSIGNED NULL,

    amount DECIMAL(18,4) NOT NULL,

    remarks TEXT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY(id),

    INDEX idx_wallet(wallet_type,wallet_id),

    INDEX idx_order(order_id),

    INDEX idx_pool(pool_id),

    INDEX idx_distribution(point_distribution_id),

    CONSTRAINT fk_transaction_source_user
    FOREIGN KEY(source_user_id)
    REFERENCES users(id),

    CONSTRAINT fk_transaction_source_admin
    FOREIGN KEY(source_admin_id)
    REFERENCES admins(id),

    CONSTRAINT fk_transaction_distribution
    FOREIGN KEY(point_distribution_id)
    REFERENCES point_distributions(id),

    CONSTRAINT fk_transaction_pool
    FOREIGN KEY(pool_id)
    REFERENCES point_pools(id)

);