-- Seed Products and BOMs

-- RFID Reader Bundle
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('RFID-RDR-001', 'RFID Reader', 'UHF RFID Reader with antenna - complete kit', 1, 'Hardware', 25000.00, 18.00, '8471', 'Unit', 1, 1, 1),
('RFID-RDR-MOD', 'RFID Reader Module', 'UHF RFID reader module 865-868 MHz', 1, 'Hardware', 15000.00, 18.00, '8471', 'Unit', 0, 0, 1),
('RFID-ANT-001', 'RFID Antenna', '9dBi circular polarized antenna', 1, 'Hardware', 4500.00, 18.00, '8529', 'Unit', 1, 0, 1),
('RFID-PWR-001', 'RFID Power Adapter', '24V DC power adapter', 1, 'Hardware', 1200.00, 18.00, '8504', 'Unit', 1, 0, 1),
('RFID-CBL-001', 'RF Cable', 'N-type to RP-SMA coaxial cable 3m', 1, 'Hardware', 800.00, 18.00, '8544', 'Unit', 0, 0, 1),
('RFID-MNT-001', 'Mounting Bracket', 'Wall/pole mount bracket for reader', 1, 'Hardware', 500.00, 18.00, '7326', 'Unit', 0, 0, 1);

-- RFID Cards
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('RFID-CRD-UHF', 'RFID UHF Card', 'ISO 18000-6C UHF RFID card', 1, 'Hardware', 35.00, 18.00, '8523', 'Unit', 1, 0, 1),
('RFID-CRD-HF', 'RFID HF Card', 'ISO 14443A/MIFARE Classic 1K card', 1, 'Hardware', 25.00, 18.00, '8523', 'Unit', 1, 0, 1),
('RFID-TAG-001', 'RFID Asset Tag', 'Metal mount UHF tag for asset tracking', 1, 'Hardware', 45.00, 18.00, '8523', 'Unit', 1, 0, 1);

-- IoT Gateway Bundle
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('IOT-DEV-001', 'IoT Gateway Device', 'Industrial IoT gateway with 4G + WiFi + BLE', 1, 'Hardware', 18000.00, 18.00, '8517', 'Unit', 1, 1, 1),
('IOT-CPU-001', 'IoT Processing Board', 'ARM Cortex-A7 processing board', 1, 'Hardware', 8000.00, 18.00, '8542', 'Unit', 0, 0, 1),
('IOT-SEN-001', 'Temperature Sensor', 'PT100 industrial temperature sensor', 1, 'Hardware', 2500.00, 18.00, '9025', 'Unit', 1, 0, 1),
('IOT-SEN-002', 'Humidity Sensor', 'Capacitive humidity sensor module', 1, 'Hardware', 1800.00, 18.00, '9025', 'Unit', 1, 0, 1),
('IOT-4G-001', '4G Module', 'LTE Cat-4 module with SIM slot', 1, 'Hardware', 3500.00, 18.00, '8517', 'Unit', 0, 0, 1),
('IOT-ENC-001', 'Industrial Enclosure', 'IP65 rated enclosure', 1, 'Hardware', 2200.00, 18.00, '3926', 'Unit', 0, 0, 1);

-- GPS Tracker Bundle
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('GPS-TRK-001', 'GPS Vehicle Tracker', 'Real-time GPS vehicle tracking device', 1, 'Hardware', 8500.00, 18.00, '8526', 'Unit', 1, 1, 1),
('GPS-MOD-001', 'GPS Module', 'GNSS module with L1 band support', 1, 'Hardware', 3500.00, 18.00, '8526', 'Unit', 0, 0, 1),
('GPS-SIM-001', 'SIM Module', 'GSM/GPRS module for data transmission', 1, 'Hardware', 2000.00, 18.00, '8517', 'Unit', 0, 0, 1),
('GPS-BAT-001', 'Backup Battery', '3.7V 2000mAh Li-ion backup battery', 1, 'Hardware', 800.00, 18.00, '8507', 'Unit', 0, 0, 1),
('GPS-HRN-001', 'Wiring Harness', 'Vehicle wiring harness with relay', 1, 'Hardware', 600.00, 18.00, '8544', 'Unit', 0, 0, 1),
('GPS-ANT-001', 'GPS Antenna', 'External GPS+GSM combo antenna', 1, 'Hardware', 1600.00, 18.00, '8529', 'Unit', 0, 0, 1);

-- IP Camera Bundle
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('CAM-IP-001', 'IP Surveillance Camera', '4MP IP camera with night vision - complete kit', 6, 'Hardware', 12000.00, 18.00, '8525', 'Unit', 1, 1, 1),
('CAM-MOD-001', 'Camera Module', '4MP CMOS sensor with IR LEDs', 6, 'Hardware', 6500.00, 18.00, '8525', 'Unit', 0, 0, 1),
('CAM-LNS-001', 'Varifocal Lens', '2.8-12mm motorized varifocal lens', 6, 'Hardware', 2500.00, 18.00, '9002', 'Unit', 0, 0, 1),
('CAM-HSG-001', 'Weatherproof Housing', 'IP67 rated outdoor housing', 6, 'Hardware', 1500.00, 18.00, '3926', 'Unit', 0, 0, 1),
('CAM-POE-001', 'PoE Injector', '802.3af PoE injector 48V', 6, 'Hardware', 1500.00, 18.00, '8504', 'Unit', 1, 0, 1);

-- Software Products (Bundles - modules to be added later)
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('SW-HREVO', 'HREvO', 'Human Resource Evolution - Complete HR Management Platform', 2, 'Software', 1000.00, 18.00, '997331', 'License', 1, 1, 1),
('SW-OPSSUITE', 'OpsSuite', 'Operations Management Suite - End-to-end operations platform', 2, 'Software', 1000.00, 18.00, '997331', 'License', 1, 1, 1),
('SW-SCMPRO', 'SCMPro', 'Supply Chain Management Pro - Complete SCM solution', 2, 'Software', 1000.00, 18.00, '997331', 'License', 1, 1, 1),
('SW-EDUPRO', 'EduPro', 'Education Management Pro - School/College ERP platform', 2, 'Software', 1000.00, 18.00, '997331', 'License', 1, 1, 1);

-- =============================================
-- BOM ENTRIES
-- =============================================

-- RFID Reader BOM
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='RFID-RDR-001'), (SELECT id FROM products WHERE sku='RFID-RDR-MOD'), 1, 1, 'Core reader module';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='RFID-RDR-001'), (SELECT id FROM products WHERE sku='RFID-ANT-001'), 1, 2, 'Antenna';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='RFID-RDR-001'), (SELECT id FROM products WHERE sku='RFID-PWR-001'), 1, 3, 'Power supply';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='RFID-RDR-001'), (SELECT id FROM products WHERE sku='RFID-CBL-001'), 1, 4, 'RF cable';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='RFID-RDR-001'), (SELECT id FROM products WHERE sku='RFID-MNT-001'), 1, 5, 'Mounting bracket';

-- IoT Gateway BOM
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='IOT-DEV-001'), (SELECT id FROM products WHERE sku='IOT-CPU-001'), 1, 1, 'Processing board';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='IOT-DEV-001'), (SELECT id FROM products WHERE sku='IOT-SEN-001'), 2, 2, '2x temperature sensors';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='IOT-DEV-001'), (SELECT id FROM products WHERE sku='IOT-SEN-002'), 1, 3, 'Humidity sensor';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='IOT-DEV-001'), (SELECT id FROM products WHERE sku='IOT-4G-001'), 1, 4, '4G connectivity';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='IOT-DEV-001'), (SELECT id FROM products WHERE sku='IOT-ENC-001'), 1, 5, 'Enclosure';

-- GPS Tracker BOM
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='GPS-TRK-001'), (SELECT id FROM products WHERE sku='GPS-MOD-001'), 1, 1, 'GPS module';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='GPS-TRK-001'), (SELECT id FROM products WHERE sku='GPS-SIM-001'), 1, 2, 'SIM module';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='GPS-TRK-001'), (SELECT id FROM products WHERE sku='GPS-BAT-001'), 1, 3, 'Backup battery';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='GPS-TRK-001'), (SELECT id FROM products WHERE sku='GPS-HRN-001'), 1, 4, 'Wiring harness';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='GPS-TRK-001'), (SELECT id FROM products WHERE sku='GPS-ANT-001'), 1, 5, 'Combo antenna';

-- IP Camera BOM
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='CAM-IP-001'), (SELECT id FROM products WHERE sku='CAM-MOD-001'), 1, 1, 'Camera module';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='CAM-IP-001'), (SELECT id FROM products WHERE sku='CAM-LNS-001'), 1, 2, 'Varifocal lens';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='CAM-IP-001'), (SELECT id FROM products WHERE sku='CAM-HSG-001'), 1, 3, 'Outdoor housing';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='CAM-IP-001'), (SELECT id FROM products WHERE sku='CAM-POE-001'), 1, 4, 'PoE injector';
