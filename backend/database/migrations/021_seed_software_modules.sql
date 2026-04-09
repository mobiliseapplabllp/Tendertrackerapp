-- =============================================
-- SOFTWARE MODULES - BOM Components for each product
-- =============================================

-- ==================== EduPro Modules (School ERP) ====================
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('EDU-MOD-ADM', 'Admissions Management', 'Online admissions, enrollment, merit lists, seat allocation', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-STU', 'Student Information System', 'Student profiles, academic records, promotions, TC generation', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-ATT', 'Attendance Management', 'Biometric/RFID attendance, leave tracking, reports', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-FEE', 'Fee Management', 'Fee structure, collection, receipts, defaulter tracking, online payment', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-TT', 'Timetable & Scheduling', 'Automated timetable generation, substitution, room allocation', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-EXM', 'Examination & Grading', 'Exam scheduling, marks entry, report cards, grade calculation', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-LIB', 'Library Management', 'Book catalog, issue/return, fine management, digital library', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-TRN', 'Transport Management', 'Route planning, GPS tracking, fee integration, driver management', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-PAR', 'Parent Portal & App', 'Parent login, attendance view, fee payments, communication', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-HR', 'Staff & HR Module', 'Staff profiles, attendance, leave, payroll integration', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-COM', 'Communication Module', 'SMS, email, push notifications, circulars, announcements', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('EDU-MOD-RPT', 'Reports & Analytics', 'Dashboards, MIS reports, custom report builder', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1);

-- ==================== OpsSuite Modules (Integrated Facility Management) ====================
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('OPS-MOD-AST', 'Asset Management', 'Asset register, lifecycle tracking, depreciation, QR/RFID tagging', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-MNT', 'Maintenance Management', 'Preventive/corrective maintenance, work orders, SLA tracking', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-HSK', 'Housekeeping Management', 'Task scheduling, inspection checklists, quality audits', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-VIS', 'Visitor Management', 'Pre-registration, check-in/out, badges, host notifications', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-HLP', 'Helpdesk & Ticketing', 'Complaint logging, assignment, escalation, resolution tracking', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-ENR', 'Energy Management', 'Meter reading, consumption tracking, bill verification, alerts', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-SPC', 'Space Management', 'Floor plans, occupancy tracking, room booking, allocation', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-VND', 'Vendor Management', 'Vendor onboarding, contracts, performance scoring, payments', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-SEC', 'Security & Access Control', 'Guard management, patrol tracking, access logs, incident reports', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-MOB', 'Mobile App & Field Ops', 'Field staff app, photo capture, GPS tracking, offline mode', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('OPS-MOD-RPT', 'Reports & Dashboards', 'KPI dashboards, SLA reports, cost analytics, custom reports', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1);

-- ==================== SCMPro Modules (Supply Chain Management) ====================
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('SCM-MOD-PRO', 'Procurement Management', 'Purchase requisitions, RFQ, PO management, approval workflows', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-INV', 'Inventory Management', 'Stock tracking, min/max levels, reorder points, batch tracking', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-WMS', 'Warehouse Management', 'Multi-warehouse, bin locations, pick/pack/ship, cycle counting', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-GRN', 'Goods Receipt & QC', 'GRN processing, quality inspection, rejection handling', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-LOG', 'Logistics & Dispatch', 'Delivery scheduling, route optimization, vehicle tracking', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-VND', 'Vendor Portal', 'Vendor self-service, PO acknowledgment, invoice submission', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-CTR', 'Contract Management', 'Rate contracts, AMC tracking, renewal alerts, compliance', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-BOM', 'BOM & Production Planning', 'Bill of materials, production orders, material requirements', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-GST', 'GST & Tax Compliance', 'GST invoicing, e-way bills, HSN mapping, returns filing', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('SCM-MOD-RPT', 'Analytics & Reports', 'Spend analytics, supplier performance, inventory aging, dashboards', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1);

-- ==================== HREvO Modules (HRIS) ====================
INSERT IGNORE INTO products (sku, name, description, category_id, sub_category, unit_price, tax_rate, hsn_code, unit_of_measure, is_standalone, is_bundle, created_by) VALUES
('HR-MOD-COR', 'Core HR & Employee Master', 'Employee profiles, org structure, documents, letter generation', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-ATT', 'Attendance & Time Tracking', 'Biometric integration, shift management, overtime, geo-fencing', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-LVE', 'Leave Management', 'Leave policies, approvals, balance tracking, comp-off, WFH', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-PAY', 'Payroll & Compliance', 'Salary processing, tax computation, PF/ESI, payslips, Form 16', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-REC', 'Recruitment & Onboarding', 'Job postings, applicant tracking, interview scheduling, offer letters', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-PMS', 'Performance Management', 'Goal setting, KRAs, appraisals, 360 feedback, bell curve', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-LMS', 'Learning & Development', 'Training calendar, course management, certifications, feedback', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-ESS', 'Employee Self Service', 'Mobile app, profile updates, payslips, leave apply, claims', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-EXP', 'Expense & Claims', 'Expense submission, approval workflows, reimbursement, travel', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-EXT', 'Exit & Separation', 'Resignation workflow, exit interviews, full & final settlement, NOC', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1),
('HR-MOD-RPT', 'Analytics & Dashboards', 'Headcount analytics, attrition, cost-to-company, custom reports', 2, 'Software', 1000.00, 18.00, '997331', 'License', 0, 0, 1);

-- =============================================
-- BOM ENTRIES FOR SOFTWARE
-- =============================================

-- EduPro BOM (12 modules)
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-ADM'), 1, 1, 'Admissions';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-STU'), 1, 2, 'Student Info';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-ATT'), 1, 3, 'Attendance';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-FEE'), 1, 4, 'Fees';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-TT'), 1, 5, 'Timetable';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-EXM'), 1, 6, 'Exams';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-LIB'), 1, 7, 'Library';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-TRN'), 1, 8, 'Transport';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-PAR'), 1, 9, 'Parent Portal';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-HR'), 1, 10, 'Staff HR';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-COM'), 1, 11, 'Communication';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-EDUPRO'), (SELECT id FROM products WHERE sku='EDU-MOD-RPT'), 1, 12, 'Reports';

-- OpsSuite BOM (11 modules)
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-AST'), 1, 1, 'Assets';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-MNT'), 1, 2, 'Maintenance';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-HSK'), 1, 3, 'Housekeeping';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-VIS'), 1, 4, 'Visitor Mgmt';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-HLP'), 1, 5, 'Helpdesk';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-ENR'), 1, 6, 'Energy';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-SPC'), 1, 7, 'Space Mgmt';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-VND'), 1, 8, 'Vendors';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-SEC'), 1, 9, 'Security';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-MOB'), 1, 10, 'Mobile App';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-OPSSUITE'), (SELECT id FROM products WHERE sku='OPS-MOD-RPT'), 1, 11, 'Reports';

-- SCMPro BOM (10 modules)
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-PRO'), 1, 1, 'Procurement';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-INV'), 1, 2, 'Inventory';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-WMS'), 1, 3, 'Warehouse';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-GRN'), 1, 4, 'GRN & QC';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-LOG'), 1, 5, 'Logistics';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-VND'), 1, 6, 'Vendor Portal';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-CTR'), 1, 7, 'Contracts';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-BOM'), 1, 8, 'BOM & Production';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-GST'), 1, 9, 'GST & Tax';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-SCMPRO'), (SELECT id FROM products WHERE sku='SCM-MOD-RPT'), 1, 10, 'Analytics';

-- HREvO BOM (11 modules)
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-COR'), 1, 1, 'Core HR';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-ATT'), 1, 2, 'Attendance';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-LVE'), 1, 3, 'Leave';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-PAY'), 1, 4, 'Payroll';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-REC'), 1, 5, 'Recruitment';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-PMS'), 1, 6, 'Performance';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-LMS'), 1, 7, 'Learning';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-ESS'), 1, 8, 'Employee Self Service';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-EXP'), 1, 9, 'Expense & Claims';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-EXT'), 1, 10, 'Exit & Separation';
INSERT IGNORE INTO product_bom (parent_product_id, component_product_id, quantity, display_order, notes) SELECT (SELECT id FROM products WHERE sku='SW-HREVO'), (SELECT id FROM products WHERE sku='HR-MOD-RPT'), 1, 11, 'Analytics';
