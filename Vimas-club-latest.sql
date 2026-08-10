CREATE TABLE notification_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    icon VARCHAR(255) DEFAULT NULL,

    status TINYINT(1) NOT NULL DEFAULT 1
        COMMENT '0=inactive, 1=active',
        
        user_preference boolean default false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uk_notification_category_name (name),

    INDEX idx_notification_category_status (status)
);

CREATE TABLE notification_types (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,

    primary_color VARCHAR(50) DEFAULT NULL,
    secondary_color VARCHAR(50) DEFAULT NULL,

    status TINYINT(1) NOT NULL DEFAULT 1
        COMMENT '0=inactive, 1=active',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uk_notification_type_name (name),

    INDEX idx_notification_type_status (status)
);

CREATE TABLE notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT NOT NULL,

    notification_category_id BIGINT UNSIGNED NOT NULL,

    notification_type_id BIGINT UNSIGNED NOT NULL,

    heading VARCHAR(255) NOT NULL,

    subheading TEXT DEFAULT NULL,

    route VARCHAR(500) DEFAULT NULL,

    data JSON DEFAULT NULL,

    is_read TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '0=unread, 1=read',

    is_user_hidden TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '0=visible, 1=hidden',

    is_admin_hidden TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '0=visible, 1=hidden by admin',

    read_at DATETIME DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_category
        FOREIGN KEY (notification_category_id)
        REFERENCES notification_categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_notification_type
        FOREIGN KEY (notification_type_id)
        REFERENCES notification_types(id)
        ON DELETE RESTRICT,

    INDEX idx_notification_user (user_id),

    INDEX idx_notification_user_read (
        user_id,
        is_read
    ),

    INDEX idx_notification_user_created (
        user_id,
        created_at
    ),

    INDEX idx_notification_category (
        notification_category_id
    ),

    INDEX idx_notification_type (
        notification_type_id
    )
);

CREATE TABLE notification_preferences (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT NOT NULL,

    notification_category_id BIGINT UNSIGNED NOT NULL,

    is_enabled TINYINT(1) NOT NULL DEFAULT 1
        COMMENT '0=disabled, 1=enabled',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_notification_preference_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_preference_category
        FOREIGN KEY (notification_category_id)
        REFERENCES notification_categories(id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_user_notification_category (
        user_id,
        notification_category_id
    ),

    INDEX idx_preference_user (user_id),

    INDEX idx_preference_category (notification_category_id)
);
