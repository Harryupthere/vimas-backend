ALTER TABLE product_bulk_details
ADD COLUMN show_total_points TINYINT(1) NOT NULL DEFAULT 1 after total_points,
ADD COLUMN show_points_sharing TINYINT(1) NOT NULL DEFAULT 1 after show_total_points;