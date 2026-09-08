ALTER TABLE product_extra_charges
ADD COLUMN payment_option_id BIGINT NOT NULL AFTER product_id,
ADD UNIQUE KEY uq_product_payment_option (product_id, payment_option_id),
 ADD CONSTRAINT fk_product_extra_charges_payment_option
  FOREIGN KEY (payment_option_id)
  REFERENCES payment_options (id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;