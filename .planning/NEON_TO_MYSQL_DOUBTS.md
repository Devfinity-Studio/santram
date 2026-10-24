# Legacy MySQL Mapping & Schema Doubts

**Date:** 2026-10-11  
**Purpose:** This document inventories every Neon (Postgres) table and its columns, details the proposed legacy MySQL connection point, and highlights **specific questions/doubts** where user clarification is needed on exact MySQL tables, columns, or procedures.

---

## Table of Contents
1. [user (Authentication & MR Profiles)](#1-user-authentication--mr-profiles)
2. [session, account, verification (Auth Sessions)](#2-session-account-verification-auth-sessions)
3. [mr_manufacturer (MR Company & Division Assignments)](#3-mr_manufacturer-mr-company--division-assignments)
4. [company (Companies / Manufacturers)](#4-company-companies--manufacturers)
5. [product (Product Catalog & Schemes)](#5-product-product-catalog--schemes)
6. [mr_inventory (Stock & Inventory)](#6-mr_inventory-stock--inventory)
7. [sale & invoice (Sales Transactions)](#7-sale--invoice-sales-transactions)
8. [outstanding (Overdue & Outstandings)](#8-outstanding-overdue--outstandings)
9. [notice (Broadcast Notices)](#9-notice-broadcast-notices)

---

### 1. `user` (Authentication & MR Profiles)

| Item | Details |
|---|---|
| **Postgres Table** | `user` |
| **Postgres Columns** | `id`, `name`, `email`, `emailVerified`, `image`, `role` ("ADMIN" / "MR"), `isBlocked`, `canViewFreeScheme`, `canViewStock`, `canViewSales`, `canViewPartyWise`, `canViewProductWise`, `locNo`, `rank`, `createdAt`, `updatedAt` |
| **Current PharmaQL Reads** | Login credential check, MR profile display on dashboard, Admin MR list (`/admin/mrs`). |
| **Proposed MySQL Source** | `pdyspvmaster.l_mktcompany_mr` (MRs) & `pdyspvmaster.m_user` (ERP system users). |

#### ❓ Doubts / Questions for You:
1. **Password Authentication:** How do MRs authenticate against the legacy ERP?
   - Does `pdyspvmaster.m_user` or `pdyspvmaster.l_mktcompany_mr` have a password column (e.g. `UPassword`, `Password`, `PWD`), and is it plain text or hashed?
   - Or do MRs log in with their Mobile Number / Email ID via OTP?
2. **Admin Account:** Are Admin users defined in `pdyspvmaster.m_user` (if so, which column distinguishes an Admin?), or should Admin credentials be defined via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)?
3. **Permissions:** Does the legacy ERP have permission columns for `canViewStock`, `canViewSales`, etc., or should all active MRs have view permissions enabled by default?

---

### 2. `session`, `account`, `verification` (Auth Sessions)

| Item | Details |
|---|---|
| **Postgres Tables** | `session`, `account`, `verification` |
| **Postgres Columns** | `id`, `token`, `userId`, `expiresAt`, `ipAddress`, `userAgent`, etc. |
| **Current PharmaQL Reads** | Session verification on every request. |
| **Proposed Solution B** | **Stateless JWT Cookie (Zero Database Storage)** — Session payload (userId, role, MR ID) is cryptographically signed and stored in an HTTP-only cookie. |

#### ❓ Doubts / Questions for You:
- Is stateless JWT cookie authentication approved? *(This requires 0 tables in MySQL and 0 local DB files).*

yes

---

### 3. `mr_manufacturer` (MR Company & Division Assignments)

| Item | Details |
|---|---|
| **Postgres Table** | `mr_manufacturer` (`mrManufacturers`) |
| **Postgres Columns** | `id`, `mrId`, `manufacturer`, `firmNo`, `division`, `company` |
| **Current PharmaQL Reads** | Read MR's assigned divisions/companies for filtering reports. |
| **Proposed MySQL Source** |
```sql
SELECT 
  mr.ID AS MrId,
  mr.MRName,
  l.Division AS DivisionName,
  m.Code AS CompanyCode,
  m.Description AS CompanyName
FROM `pdyspvmaster`.`l_mktcompany_mr` mr
LEFT JOIN `pdyspvmaster`.`l_mktcompany` l ON mr.DivisionID = l.ID
LEFT JOIN `pdyspvmaster`.`m_mktcompany` m ON l.CompCode = m.Code
WHERE mr.ID = ?
```

#### ❓ Doubts / Questions for You:
1. Is `l_mktcompany_mr` the single source of truth for an MR's assigned division and company?
2. Can a single MR ID have multiple rows in `l_mktcompany_mr` if they handle multiple divisions, or is there another mapping table?

no a single MR can have multiple assignments but the table is the only source of truth with the m_mktcompany_mr joined with it

---

### 4. `company` (Companies / Manufacturers)

| Item | Details |
|---|---|
| **Postgres Table** | `company` (`companies`) |
| **Postgres Columns** | `name` (PK), `isActive`, `createdAt`, `updatedAt` |
| **Current PharmaQL Reads** | Company dropdown filters, `/admin/companies`, `/api/products`. |
| **Proposed MySQL Source** | `pdyspvmaster.m_mktcompany` (`Code`, `Description`, `IsInActive`). |

#### ❓ Doubts / Questions for You:
- In `pdyspvmaster.m_mktcompany`, is `Code` (e.g. `'AASPAN'`, `'STARTOS'`) the primary code to use for all report filters, and `Description` for the UI label?

that is not the code the code is supposed to be the first word of the company string. for e.g. if its XYZ health care the code will be XYZ

---

### 5. `product` (Product Catalog & Schemes)

| Item | Details |
|---|---|
| **Postgres Table** | `product` (`products`) |
| **Postgres Columns** | `id`, `name`, `freeScheme` (e.g. "10+2"), `manufacturer`, `firmNo`, `code`, `division`, `ingredients` |
| **Current PharmaQL Reads** | `/products/[company]`, `/api/products`, fallback report views. |
| **Proposed MySQL Source** | `pdyspvmaster.m_item` or live stored procedures. |

#### ❓ Doubts / Questions for You:
1. Should product catalog queries read from `pdyspvmaster.m_item`?
   - What are the exact columns in `pdyspvmaster.m_item` for Item Code, Item Name, Pack, and Company Code? (e.g., `ItemCode`, `ItemName`, `Pack`, `CompCode`?)
2. Where is `freeScheme` (e.g. "10+2" or scheme details) stored in the legacy database, or is it handled solely inside the `rptClaimData` procedure?


1. yes
2. yes rpt claim data process
---

### 6. `mr_inventory` (Stock & Inventory)

| Item | Details |
|---|---|
| **Postgres Table** | `mr_inventory` (`mrInventory`) |
| **Postgres Columns** | `id`, `mrId`, `productId`, `stock`, `date`, `opening`, `inward`, `outward`, `ptr`, `mrp`, `prate` |
| **Current PharmaQL Reads** | Fallback in `stock-report-view.tsx`, `mr-dashboard-content.tsx`, `download-stock/route.ts`. |
| **Proposed MySQL Source** | **Stored Procedure:** `pdyspvtrans.rptStockMovementStatement` |

#### ❓ Doubts / Questions for You:
- Can we completely deprecate the `mr_inventory` table and rely 100% on `CALL rptStockMovementStatement(...)` for all stock views and Excel exports?

yes we have to
---

### 7. `sale` & `invoice` (Sales Transactions)

| Item | Details |
|---|---|
| **Postgres Tables** | `sale`, `invoice` |
| **Postgres Columns** | `id`, `productId`, `mrId`, `quantity`, `amount`, `freeQty`, `dealer`, `area`, `date`, `invNo`, `invAmt` |
| **Current PharmaQL Reads** | Fallback in `product-report-view.tsx`, `party-report-view.tsx`, Overview metric cards. |
| **Proposed MySQL Source** | **Stored Procedures:**<br>• Product Wise: `pdyspvtrans.rptItemCustomerSale`<br>• Party Wise: `pdyspvtrans.rptCompanyCustomerItemwiseSales` |

#### ❓ Doubts / Questions for You:
- For the Overview Dashboard metric cards ("Total Sales Volume" and "Total Invoices"):
  - Should we calculate them on-the-fly by querying `rptItemCustomerSale` for the current month?

yes you can also cache them for a day
---

### 8. `outstanding` (Overdue & Outstandings)

| Item | Details |
|---|---|
| **Postgres Table** | `outstanding` |
| **Postgres Columns** | `id`, `mrId`, `doctor`, `city`, `invNo`, `invDt`, `invAmt`, `manufacturerCode`, `division` |
| **Current PharmaQL Reads** | Fallback in `overdue-report-view.tsx`, `download-outstanding/route.ts`, Overview card. |
| **Proposed MySQL Source** | **Stored Procedure:** `pdyspvtrans.rptMRwisePeriodicalOutstanding` |

#### ❓ Doubts / Questions for You:
- Can we confirm that all overdue/outstanding reporting and exports should be sourced strictly from `CALL rptMRwisePeriodicalOutstanding(...)`?

yes absolutely.
---

### 9. `notice` (Broadcast Notices)

| Item | Details |
|---|---|
| **Postgres Table** | `notice` |
| **Postgres Columns** | `id`, `title`, `content`, `variant`, `isActive`, `expiresAt`, `createdAt`, `updatedAt` |
| **Current PharmaQL Reads / Writes** | Admin creates/edits notices; MR dashboard displays active notices. |
| **Proposed Solution B** | Lightweight server JSON file (`data/notices.json`). |

#### ❓ Doubts / Questions for You:
- Does the legacy ERP system already have an internal notice or announcement table in `pdyspvmaster` that we should read from, or is storing broadcast notices in `data/notices.json` the preferred approach?

no it doesnt have.
---

## Summary of Input Needed from You:
Please reply with specifications for:
1. **MR Authentication:** Which table & column contains MR passwords/credentials in `pdyspvmaster` (e.g., `m_user`), or do you prefer OTP/mobile login? OTP login only. just add the ability to explisitely mention some admin users with email and password hash. the rest is OTP only.

add one developer account too. (we will add developer abilites later)

2. **Admin Credentials:** Should admin login check `m_user` or use environment variables (`ADMIN_EMAIL`/`ADMIN_PASSWORD`)? yes mention the admin and developer creds in the env file
3. **Product Catalog:** What are the exact column names in `pdyspvmaster.m_item` (ItemCode, ItemName, CompCode)? 
4. **Notices:** Local `data/notices.json` or is there an existing ERP notice table?

this is the item query 
select `pdyspvmaster`.`m_item`.`ID` AS `ID`,`pdyspvmaster`.`m_item`.`AWACSCode` AS `AWACSCode`,`pdyspvmaster`.`m_item`.`SeriesID` AS `SeriesID`,`pdyspvmaster`.`m_item`.`ItemCode` AS `ItemCode`,`pdyspvmaster`.`m_item`.`ItemName` AS `ItemName`,`pdyspvmaster`.`m_item`.`PrintName` AS `PrintName`,`pdyspvmaster`.`m_item`.`Packing` AS `Packing`,`pdyspvmaster`.`m_item`.`BaseUnit` AS `BaseUnit`,`pdyspvmaster`.`m_item`.`PurcUnit` AS `PurcUnit`,`pdyspvmaster`.`m_item`.`QtyPerPurcUnit` AS `QtyPerPurcUnit`,`pdyspvmaster`.`m_item`.`MktByID` AS `MktByID`,`pdyspvmaster`.`m_item`.`MktBy` AS `MktBy`,`pdyspvmaster`.`m_item`.`MfgByID` AS `MfgByID`,`pdyspvmaster`.`m_item`.`DivisionId` AS `DivisionId`,`pdyspvmaster`.`m_item`.`Division` AS `Division`,`pdyspvmaster`.`m_item`.`AllowInvDisc` AS `AllowInvDisc`,`pdyspvmaster`.`m_item`.`DiscPer` AS `DiscPer`,`pdyspvmaster`.`m_item`.`MinNetQty` AS `MinNetQty`,`pdyspvmaster`.`m_item`.`MultipleOfQty` AS `MultipleOfQty`,`pdyspvmaster`.`m_item`.`MinSaleQty` AS `MinSaleQty`,`pdyspvmaster`.`m_item`.`AllowSLRT` AS `AllowSLRT`,`pdyspvmaster`.`m_item`.`AllowChangePTR` AS `AllowChangePTR`,`pdyspvmaster`.`m_item`.`IncSS` AS `IncSS`,`pdyspvmaster`.`m_item`.`ItemCatgID` AS `ItemCatgID`,`pdyspvmaster`.`m_item`.`ItemCategory` AS `ItemCategory`,`pdyspvmaster`.`m_item`.`IsColdChain` AS `IsColdChain`,`pdyspvmaster`.`m_item`.`ItemGroup` AS `ItemGroup`,`pdyspvmaster`.`m_item`.`MISRate` AS `MISRate`,`pdyspvmaster`.`m_item`.`HSN` AS `HSN`,`pdyspvmaster`.`m_item`.`TaxGrpCode` AS `TaxGrpCode`,`pdyspvmaster`.`m_item`.`GeneralTaxP` AS `GeneralTaxP`,`pdyspvmaster`.`m_item`.`CompNo` AS `CompNo`,`pdyspvmaster`.`m_item`.`Initial` AS `Initial`,`pdyspvmaster`.`m_item`.`Notes` AS `Notes`,`pdyspvmaster`.`m_item`.`Remark` AS `Remark`,`pdyspvmaster`.`m_item`.`ItemUnder` AS `ItemUnder`,`pdyspvmaster`.`m_item`.`shortIname` AS `shortIname`,`pdyspvmaster`.`m_item`.`AllowSALE` AS `AllowSALE`,`pdyspvmaster`.`m_item`.`VendorRefICode` AS `VendorRefICode`,`pdyspvmaster`.`m_item`.`AllowBranchTrans` AS `AllowBranchTrans`,`pdyspvmaster`.`m_item`.`Block` AS `Block`,`pdyspvmaster`.`m_item`.`CNQty` AS `CNQty`,`pdyspvmaster`.`m_item`.`CNFree` AS `CNFree`,`pdyspvmaster`.`m_item`.`CreatedBy` AS `CreatedBy`,`pdyspvmaster`.`m_item`.`CreatedDate` AS `CreatedDate`,`pdyspvmaster`.`m_item`.`EditedBy` AS `EditedBy`,`pdyspvmaster`.`m_item`.`EditedDate` AS `EditedDate`,`pdyspvmaster`.`m_item`.`RowVersion` AS `RowVersion`,`pdyspvmaster`.`m_item`.`PriQty` AS `PriQty`,`pdyspvmaster`.`m_item`.`PriContains` AS `PriContains`,`pdyspvmaster`.`m_item`.`PriContainsUnit` AS `PriContainsUnit`,`pdyspvmaster`.`m_item`.`PerBoxPri` AS `PerBoxPri`,`pdyspvmaster`.`m_item`.`PerTerPri` AS `PerTerPri`,`pdyspvmaster`.`m_item`.`EffectInward` AS `EffectInward`,`pdyspvmaster`.`m_item`.`LBatchNo` AS `LBatchNo`,`pdyspvmaster`.`m_item`.`LPrate` AS `LPrate`,`pdyspvmaster`.`m_item`.`LPTR` AS `LPTR`,`pdyspvmaster`.`m_item`.`LMRP` AS `LMRP`,`pdyspvmaster`.`m_item`.`LExpDt` AS `LExpDt`,`pdyspvmaster`.`m_item`.`PTRMarginP` AS `PTRMarginP`,`pdyspvmaster`.`m_item`.`PRateMarginP` AS `PRateMarginP`,`pdyspvmaster`.`m_item`.`InActive` AS `InActive`,`pdyspvmaster`.`m_item`.`IsUpdated` AS `IsUpdated`,`pdyspvmaster`.`m_item`.`DropPTR` AS `DropPTR`,`pdyspvmaster`.`m_item`.`ItemMainCategory` AS `ItemMainCategory`,`pdyspvmaster`.`m_item`.`ItemSubCategory` AS `ItemSubCategory`,`pdyspvmaster`.`m_item`.`LMfgBy` AS `LMfgBy`,`pdyspvmaster`.`m_item`.`AllowExpiry` AS `AllowExpiry`,`pdyspvmaster`.`m_item`.`OldTaxGrpCode` AS `OldTaxGrpCode`,`pdyspvmaster`.`m_item`.`OldLMRP` AS `OldLMRP`,`pdyspvmaster`.`m_item`.`SchMinQty` AS `SchMinQty` from `pdyspvmaster`.`m_item`
