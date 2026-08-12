-- CreateTable
CREATE TABLE "Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customer_no" TEXT NOT NULL,
    "agreement_ref_number" TEXT NOT NULL,
    "client_type" TEXT NOT NULL,
    "title" TEXT,
    "first_name" TEXT,
    "surname" TEXT,
    "company_name" TEXT,
    "vat_no" TEXT,
    "company_reg_no" TEXT,
    "id_passport_no" TEXT,
    "billing_cycle" TEXT,
    "anniversary_month" INTEGER NOT NULL,
    "client_since" DATETIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "captured_by" TEXT,
    "captured_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT NOT NULL DEFAULT 'EFT',
    "bank_name" TEXT,
    "account_type" TEXT,
    "branch_code" TEXT,
    "account_no" TEXT,
    "cc_provider" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "site_name" TEXT NOT NULL,
    "street_address" TEXT NOT NULL,
    "town_id" INTEGER,
    "suburb_id" INTEGER,
    "sector_id" INTEGER,
    "estate_id" INTEGER,
    "site_phone" TEXT,
    "radio_no" TEXT,
    "radio_no_2" TEXT,
    "comms_no" TEXT,
    "comms_no_2" TEXT,
    "primary_transmitter" TEXT NOT NULL DEFAULT 'NONE',
    "secondary_transmitter" TEXT NOT NULL DEFAULT 'NONE',
    "cctv_camera_count" INTEGER NOT NULL DEFAULT 0,
    "annual_maintenance_fee" REAL NOT NULL DEFAULT 0,
    "access_type" TEXT NOT NULL DEFAULT 'NONE',
    "key_number_ref" TEXT,
    "key_vault_location" TEXT DEFAULT 'Main Office Safe',
    "access_code_notes" TEXT,
    "site_operations_notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Site_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Site_town_id_fkey" FOREIGN KEY ("town_id") REFERENCES "Town" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Site_suburb_id_fkey" FOREIGN KEY ("suburb_id") REFERENCES "Suburb" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Site_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "Sector" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Site_estate_id_fkey" FOREIGN KEY ("estate_id") REFERENCES "Estate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "full_name" TEXT NOT NULL,
    "primary_phone" TEXT NOT NULL,
    "secondary_phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteEmergencyContact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "site_id" INTEGER NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "priority_order" INTEGER NOT NULL,
    "relationship_type" TEXT NOT NULL,
    CONSTRAINT "SiteEmergencyContact_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SiteEmergencyContact_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "EmergencyContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientService" (
    "client_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "negotiated_fee" REAL NOT NULL,
    "base_fee_at_booking" REAL NOT NULL,
    "discount_reason" TEXT,
    "is_negotiated" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("client_id", "service_id"),
    CONSTRAINT "ClientService_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientService_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditTariffAdjustment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "base_fee" REAL NOT NULL,
    "negotiated_fee" REAL NOT NULL,
    "variance" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "captured_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditTariffAdjustment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditTariffAdjustment_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Town" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Suburb" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Estate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Service" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "base_fee" REAL NOT NULL,
    "is_annual" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_customer_no_key" ON "Client"("customer_no");

-- CreateIndex
CREATE UNIQUE INDEX "Client_agreement_ref_number_key" ON "Client"("agreement_ref_number");

-- CreateIndex
CREATE INDEX "Client_surname_company_name_idx" ON "Client"("surname", "company_name");
