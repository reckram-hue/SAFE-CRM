-- CreateTable
CREATE TABLE "AlarmMake" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AlarmModel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "makeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "AlarmModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "AlarmMake" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ZoneType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ClientZone" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "zoneNumber" INTEGER NOT NULL,
    "zoneTypeId" INTEGER NOT NULL,
    "description" TEXT,
    CONSTRAINT "ClientZone_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientZone_zoneTypeId_fkey" FOREIGN KEY ("zoneTypeId") REFERENCES "ZoneType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
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
    "updated_at" DATETIME NOT NULL,
    "alarmMakeId" INTEGER,
    "alarmModelId" INTEGER,
    CONSTRAINT "Client_alarmMakeId_fkey" FOREIGN KEY ("alarmMakeId") REFERENCES "AlarmMake" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_alarmModelId_fkey" FOREIGN KEY ("alarmModelId") REFERENCES "AlarmModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("account_no", "account_type", "agreement_ref_number", "anniversary_month", "bank_name", "billing_cycle", "branch_code", "captured_by", "captured_date", "cc_provider", "client_since", "client_type", "company_name", "company_reg_no", "created_at", "customer_no", "first_name", "id", "id_passport_no", "is_active", "payment_method", "surname", "title", "updated_at", "vat_no", "version") SELECT "account_no", "account_type", "agreement_ref_number", "anniversary_month", "bank_name", "billing_cycle", "branch_code", "captured_by", "captured_date", "cc_provider", "client_since", "client_type", "company_name", "company_reg_no", "created_at", "customer_no", "first_name", "id", "id_passport_no", "is_active", "payment_method", "surname", "title", "updated_at", "vat_no", "version" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_customer_no_key" ON "Client"("customer_no");
CREATE UNIQUE INDEX "Client_agreement_ref_number_key" ON "Client"("agreement_ref_number");
CREATE INDEX "Client_surname_company_name_idx" ON "Client"("surname", "company_name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AlarmMake_name_key" ON "AlarmMake"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AlarmModel_makeId_name_key" ON "AlarmModel"("makeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneType_label_key" ON "ZoneType"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ClientZone_clientId_zoneNumber_key" ON "ClientZone"("clientId", "zoneNumber");
