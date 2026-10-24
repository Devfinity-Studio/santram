# Phase 9: Legacy MySQL MR User Integration Plan

## Goal
Transition all Medical Representative (MR) identity, profile, and authorization metadata lookups from the Neon PostgreSQL `user` table to the client's legacy MySQL database schema (`pdyspvmaster.m_user`).

---

## 1. Overview & Architecture

### Legacy Schema: `pdyspvmaster.m_user`
The legacy MySQL database is accessed via `legacyDb` (`mysql2/promise`) using credentials configured in `.env` (`CLIENT_MYSQL_*` pointing to `pdyspvmaster` and `pdyspvtrans`).

The explicit SQL schema specified by the client:
```sql
SELECT 
    `pdyspvmaster`.`m_user`.`ID` AS `ID`,
    `pdyspvmaster`.`m_user`.`UCode` AS `UCode`,
    `pdyspvmaster`.`m_user`.`Description` AS `Description`,
    `pdyspvmaster`.`m_user`.`Password` AS `Password`,
    `pdyspvmaster`.`m_user`.`JobProfile` AS `JobProfile`,
    `pdyspvmaster`.`m_user`.`Education` AS `Education`,
    `pdyspvmaster`.`m_user`.`Address1` AS `Address1`,
    `pdyspvmaster`.`m_user`.`Address2` AS `Address2`,
    `pdyspvmaster`.`m_user`.`Address3` AS `Address3`,
    `pdyspvmaster`.`m_user`.`City` AS `City`,
    `pdyspvmaster`.`m_user`.`Area` AS `Area`,
    `pdyspvmaster`.`m_user`.`ContactNoR` AS `ContactNoR`,
    `pdyspvmaster`.`m_user`.`MobileNo` AS `MobileNo`,
    `pdyspvmaster`.`m_user`.`EmailId` AS `EmailId`,
    `pdyspvmaster`.`m_user`.`DOB` AS `DOB`,
    `pdyspvmaster`.`m_user`.`DOA` AS `DOA`,
    `pdyspvmaster`.`m_user`.`DOJ` AS `DOJ`,
    `pdyspvmaster`.`m_user`.`DOR` AS `DOR`,
    `pdyspvmaster`.`m_user`.`Gender` AS `Gender`,
    `pdyspvmaster`.`m_user`.`BloodGroup` AS `BloodGroup`,
    `pdyspvmaster`.`m_user`.`RefrenceBy` AS `RefrenceBy`,
    `pdyspvmaster`.`m_user`.`RefrenceContact` AS `RefrenceContact`,
    `pdyspvmaster`.`m_user`.`Guardian` AS `Guardian`,
    `pdyspvmaster`.`m_user`.`GuardianContact` AS `GuardianContact`,
    `pdyspvmaster`.`m_user`.`ValidityDays` AS `ValidityDays`,
    `pdyspvmaster`.`m_user`.`PasswordExpDt` AS `PasswordExpDt`,
    `pdyspvmaster`.`m_user`.`Notes` AS `Notes`,
    `pdyspvmaster`.`m_user`.`IsSalesMan` AS `IsSalesMan`,
    `pdyspvmaster`.`m_user`.`IsDeliveryman` AS `IsDeliveryman`,
    `pdyspvmaster`.`m_user`.`IsBlocked` AS `IsBlocked`,
    `pdyspvmaster`.`m_user`.`IsSaleUser` AS `IsSaleUser`,
    `pdyspvmaster`.`m_user`.`RestrictComNo` AS `RestrictComNo`,
    `pdyspvmaster`.`m_user`.`RestrictLocNo` AS `RestrictLocNo`,
    `pdyspvmaster`.`m_user`.`RestrictYearNo` AS `RestrictYearNo`,
    `pdyspvmaster`.`m_user`.`UserImg` AS `UserImg`,
    `pdyspvmaster`.`m_user`.`xCode` AS `xCode`,
    `pdyspvmaster`.`m_user`.`WorkingDate` AS `WorkingDate`,
    `pdyspvmaster`.`m_user`.`LogCmpNo` AS `LogCmpNo`,
    `pdyspvmaster`.`m_user`.`LogLocNo` AS `LogLocNo`,
    `pdyspvmaster`.`m_user`.`LogYearNo` AS `LogYearNo`,
    `pdyspvmaster`.`m_user`.`LogStatus` AS `LogStatus`,
    `pdyspvmaster`.`m_user`.`WorkingAddress` AS `WorkingAddress`,
    `pdyspvmaster`.`m_user`.`LogInDateTime` AS `LogInDateTime`,
    `pdyspvmaster`.`m_user`.`WorkingDateTime` AS `WorkingDateTime`,
    `pdyspvmaster`.`m_user`.`CreatedBy` AS `CreatedBy`,
    `pdyspvmaster`.`m_user`.`CreatedDate` AS `CreatedDate`,
    `pdyspvmaster`.`m_user`.`EditedBy` AS `EditedBy`,
    `pdyspvmaster`.`m_user`.`EditedDate` AS `EditedDate`,
    `pdyspvmaster`.`m_user`.`RowVersion` AS `RowVersion`,
    `pdyspvmaster`.`m_user`.`UserGroup` AS `UserGroup`,
    `pdyspvmaster`.`m_user`.`showMargin` AS `showMargin`,
    `pdyspvmaster`.`m_user`.`Chalprinter` AS `Chalprinter`,
    `pdyspvmaster`.`m_user`.`SalePrinter` AS `SalePrinter`,
    `pdyspvmaster`.`m_user`.`SaleRestrictedICS` AS `SaleRestrictedICS`,
    `pdyspvmaster`.`m_user`.`StageID` AS `StageID`,
    `pdyspvmaster`.`m_user`.`PrintInvoice` AS `PrintInvoice`
FROM `pdyspvmaster`.`m_user`
```

---

## 2. Planned Implementation Tasks

### Task 1: Finalize Centralized Action `src/server/actions/mrInfo.ts`
- Expose `getMRInfo(identifier)` to fetch a single user by ID, UCode, Description, or Email.
- Expose `getAllMRUsers()` to return all legacy users from `pdyspvmaster.m_user`.
- Ensure robust fallbacks for Postgres session mappings while the system transitions to MySQL primary keys.

### Task 2: Update Server Components & Dashboards
Replace all Neon `db.select().from(user).where(eq(user.id, mrId))` calls with `getMRInfo(mrId)`:
1. **`src/app/admin/mrs/[id]/page.tsx`**: Replace direct user query with `await getMRInfo(decodedId)`.
2. **`src/components/mr-dashboard-content.tsx`**: Replace `db.select().from(user)` with `await getMRInfo(mrId)`.
3. **`src/components/stock-report-view.tsx`**: Replace `db.select().from(user)` with `await getMRInfo(mrId)`.
4. **`src/components/sales-report-view.tsx`**: Replace `db.select().from(user)` with `await getMRInfo(mrId)`.
5. **`src/components/new-sales-report-view.tsx`**: Replace `db.select().from(user)` with `await getMRInfo(mrId)`.
6. **`src/components/product-report-view.tsx`**: Replace `db.select().from(user)` with `await getMRInfo(mrId)`.
7. **`src/components/outstanding-report-view.tsx`**: Replace `db.select().from(user)` with `await getMRInfo(mrId)`.
8. **`src/components/overdue-report-view.tsx`**: Replace `db.select().from(user)` with `await getMRInfo(mrId)`.
9. **`src/components/free-scheme-report-view.tsx`**: Replace `db.select().from(user)` with `await getMRInfo(mrId)`.

### Task 3: Update API Report Download Routes
Update all download handlers to call `getMRInfo(mrId)`:
1. `src/app/api/reports/download-stock/route.ts`
2. `src/app/api/reports/download-sales/route.ts`
3. `src/app/api/reports/download/route.ts`
4. `src/app/api/reports/download-outstanding/route.ts`

### Task 4: Update Admin MR Management Views
- In `src/app/admin/mrs/page.tsx`, integrate `getAllMRUsers()` so administrators can see and manage representatives directly from `pdyspvmaster.m_user`.

### Task 5: Build & Type-Check Verification
- Execute `pnpm run build` to verify clean compilation with zero type errors.
- Test dashboard rendering for both legacy codes (`ADMIN`, `ACO01`, `BHA01`, etc.) and mapped identifiers.
