-- Development reference data; does not create accounts or secrets.
SET NAMES utf8mb4;
INSERT INTO branches (code,name,address_line) VALUES ('HN-01','Chi nhánh Hà Nội 01','Dữ liệu phát triển') ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO warehouses (branch_id,code,name) SELECT id,'HN-01-MAIN','Kho chính Hà Nội 01' FROM branches WHERE code='HN-01' ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO roles (code,name,description) VALUES ('ADMIN','Quản trị viên','Quản lý toàn bộ hệ thống'),('MANAGER','Quản lý','Quản lý vận hành'),('RECEPTIONIST','Tiếp nhận','Tiếp nhận khách hàng và phiếu'),('TECHNICIAN','Kỹ thuật viên','Chẩn đoán và sửa chữa') ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description);
INSERT INTO device_types (code,name) VALUES ('AIR_CONDITIONER','Máy điều hòa'),('REFRIGERATOR','Tủ lạnh'),('WASHING_MACHINE','Máy giặt'),('MICROWAVE','Lò vi sóng') ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO inventory_items (sku,name,unit,standard_cost,default_sale_price,reorder_level) VALUES ('DEV-CAP-10UF','Tụ điện 10uF','piece',15000,25000,5),('DEV-FUSE-10A','Cầu chì 10A','piece',5000,10000,10) ON DUPLICATE KEY UPDATE name=VALUES(name),standard_cost=VALUES(standard_cost),default_sale_price=VALUES(default_sale_price),reorder_level=VALUES(reorder_level);
INSERT INTO inventory_stocks (warehouse_id,inventory_item_id,quantity_on_hand,quantity_reserved) SELECT w.id,i.id,0,0 FROM warehouses w CROSS JOIN inventory_items i WHERE w.code='HN-01-MAIN' ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP;
