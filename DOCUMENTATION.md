# PGtrack - Hostel/PG Management System

## Complete Technical Documentation

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Platform:** Lovable Cloud (React + Supabase)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [User Roles & Access Control](#5-user-roles--access-control)
6. [Feature Modules](#6-feature-modules)
7. [Edge Functions (Backend)](#7-edge-functions-backend)
8. [WhatsApp Integration](#8-whatsapp-integration)
9. [Authentication Flow](#9-authentication-flow)
10. [API Reference](#10-api-reference)
11. [Security Considerations](#11-security-considerations)
12. [Deployment Guide](#12-deployment-guide)
13. [Known Limitations](#13-known-limitations)
14. [Future Roadmap](#14-future-roadmap)

---

## 1. Project Overview

### What is PGtrack?

PGtrack is a comprehensive hostel/paying guest (PG) management system designed to help property managers efficiently manage:

- Multiple campus/property locations
- Tenant information and occupancy
- Room inventory and pricing
- Monthly billing and payments
- Expense tracking
- WhatsApp-based payment reminders
- Financial reporting

### Target Users

| User Type | Description |
|-----------|-------------|
| **Super Admin** | System administrator who manages all managers and campuses |
| **Manager** | Property manager who manages tenants, rooms, billing for their campuses |
| **Tenant** | End-user who receives WhatsApp reminders (no login access) |

---

## 2. Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Build tool & dev server |
| **TailwindCSS** | Utility-first CSS framework |
| **shadcn/ui** | Component library |
| **React Router v6** | Client-side routing |
| **TanStack Query** | Server state management |
| **Recharts** | Data visualization |
| **Lucide React** | Icon library |

### Backend (Lovable Cloud / Supabase)

| Technology | Purpose |
|------------|---------|
| **Supabase Auth** | Authentication & user management |
| **Supabase Database** | PostgreSQL database |
| **Supabase Edge Functions** | Serverless backend logic (Deno) |
| **Supabase Storage** | File storage for invoices |
| **Row Level Security (RLS)** | Database-level access control |

### External Integrations

| Service | Purpose |
|---------|---------|
| **Meta WhatsApp Business API** | Send payment reminders to tenants |

---

## 3. Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │ Tenants  │ │ Billing  │ │ Reports  │ ...       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                         │                                       │
│               ┌─────────▼─────────┐                             │
│               │  TanStack Query   │ (State Management)          │
│               └─────────┬─────────┘                             │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Client SDK                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Supabase   │  │  Supabase   │  │  Supabase   │
│    Auth     │  │  Database   │  │   Edge Fn   │
└─────────────┘  └──────┬──────┘  └──────┬──────┘
                        │                │
                        │                ▼
                        │         ┌─────────────┐
                        │         │  WhatsApp   │
                        │         │  Cloud API  │
                        │         └─────────────┘
                        ▼
               ┌─────────────────┐
               │   PostgreSQL    │
               │  (with RLS)     │
               └─────────────────┘
```

### File Structure

```
src/
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   │   ├── BillsTable.tsx
│   │   ├── KPICard.tsx
│   │   ├── OccupancyChart.tsx
│   │   └── RevenueChart.tsx
│   ├── layout/             # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SuperAdminLayout.tsx
│   │   └── SuperAdminSidebar.tsx
│   ├── modals/             # Modal dialogs
│   │   ├── CampusModal.tsx
│   │   ├── ExpenseModal.tsx
│   │   ├── ManualBillModal.tsx
│   │   ├── PaymentModal.tsx
│   │   ├── RoomModal.tsx
│   │   └── TenantModal.tsx
│   └── ui/                 # shadcn/ui components
├── contexts/
│   └── AuthContext.tsx     # Authentication context
├── hooks/                  # Custom React hooks
│   ├── useBills.ts
│   ├── useCampuses.ts
│   ├── useDashboardStats.ts
│   ├── useExpenses.ts
│   ├── useReminders.ts
│   ├── useReports.ts
│   ├── useRooms.ts
│   └── useTenants.ts
├── pages/
│   ├── super-admin/        # Super admin pages
│   │   ├── AccessRequests.tsx
│   │   ├── Campuses.tsx
│   │   ├── Managers.tsx
│   │   └── Overview.tsx
│   ├── Billing.tsx
│   ├── Campuses.tsx
│   ├── Dashboard.tsx
│   ├── Expenses.tsx
│   ├── Index.tsx           # Landing page
│   ├── Login.tsx
│   ├── Profile.tsx
│   ├── Reminders.tsx
│   ├── Reports.tsx
│   ├── RequestAccess.tsx
│   ├── Rooms.tsx
│   ├── Setup.tsx
│   └── Tenants.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts       # Supabase client (auto-generated)
│       └── types.ts        # TypeScript types (auto-generated)
└── lib/
    └── utils.ts            # Utility functions

supabase/
└── functions/              # Edge functions
    ├── access-request/
    ├── admin-manage-requests/
    ├── bootstrap-admin/
    ├── create-test-manager/
    ├── generate-bills/
    ├── generate-invoice/
    ├── reset-admin-password/
    ├── send-whatsapp/
    └── whatsapp-webhook/
```

---

## 4. Database Schema

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   profiles  │     │   campuses  │     │    rooms    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ email       │     │ user_id(FK) │◄────│ campus_id   │
│ full_name   │     │ name        │     │ user_id     │
│ phone       │     │ address     │     │ room_no     │
│ role        │     │ city        │     │ room_type   │
│ whatsapp_   │     │ notes       │     │ capacity    │
│   consent   │     │ created_at  │     │ rent_amount │
│ is_disabled │     │ updated_at  │     │ is_active   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   tenants   │     │   bills     │
                    ├─────────────┤     ├─────────────┤
                    │ id (PK)     │◄────│ tenant_id   │
                    │ campus_id   │     │ campus_id   │
                    │ room_id     │     │ user_id     │
                    │ user_id     │     │ bill_month  │
                    │ full_name   │     │ rent_amount │
                    │ phone       │     │ electricity │
                    │ rent_amount │     │ water       │
                    │ move_in_date│     │ other       │
                    │ tenant_type │     │ total       │
                    │ whatsapp_   │     │ due_date    │
                    │   optin     │     │ payment_    │
                    │ is_active   │     │   status    │
                    └─────────────┘     └─────────────┘
                           │                   │
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  expenses   │     │whatsapp_logs│
                    ├─────────────┤     ├─────────────┤
                    │ id (PK)     │     │ id (PK)     │
                    │ campus_id   │     │ tenant_id   │
                    │ user_id     │     │ bill_id     │
                    │ expense_type│     │ user_id     │
                    │ amount      │     │ phone       │
                    │ description │     │ status      │
                    │ expense_date│     │ message_type│
                    └─────────────┘     │ error_msg   │
                                        └─────────────┘

┌─────────────────┐
│pending_requests │  (For new manager registrations)
├─────────────────┤
│ id (PK)         │
│ email           │
│ full_name       │
│ phone           │
│ reason          │
│ status          │
└─────────────────┘
```

### Tables Detail

#### `profiles`
Stores user profile information linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (matches auth.users.id) |
| email | TEXT | User email |
| full_name | TEXT | Display name |
| phone | TEXT | Contact number |
| role | TEXT | 'manager' or 'super_admin' |
| whatsapp_consent | BOOLEAN | Manager's consent to send WhatsApp |
| is_disabled | BOOLEAN | Account disabled flag |

#### `campuses`
Property/hostel locations managed by a user.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner (manager) ID |
| name | TEXT | Campus name |
| address | TEXT | Full address |
| city | TEXT | City name |
| notes | TEXT | Additional notes |

#### `rooms`
Rooms within each campus.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campus_id | UUID | Parent campus |
| room_no | TEXT | Room number/name |
| room_type | TEXT | 'Single', 'Double', 'Triple' |
| capacity | INTEGER | Max occupants |
| rent_amount | DECIMAL | Monthly rent |
| is_active | BOOLEAN | Available for booking |

#### `tenants`
Tenant/resident information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campus_id | UUID | Campus where tenant stays |
| room_id | UUID | Assigned room |
| full_name | TEXT | Tenant name |
| phone | TEXT | Phone number (for WhatsApp) |
| rent_amount | DECIMAL | Monthly rent |
| security_deposit | DECIMAL | Deposit amount |
| move_in_date | DATE | Check-in date |
| tenant_type | TEXT | 'Student', 'Working' |
| whatsapp_optin | BOOLEAN | Opted in for WhatsApp |
| is_active | BOOLEAN | Currently staying |

#### `bills`
Monthly bills for tenants.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Bill for tenant |
| campus_id | UUID | Campus reference |
| bill_month | DATE | Billing period (1st of month) |
| rent_amount | DECIMAL | Rent component |
| electricity_amount | DECIMAL | Electricity charges |
| water_amount | DECIMAL | Water charges |
| other_charges | DECIMAL | Miscellaneous |
| total_amount | DECIMAL | Sum of all charges |
| due_date | DATE | Payment due date |
| payment_status | TEXT | 'Pending', 'Paid', 'Overdue' |
| payment_date | DATE | When paid |
| payment_method | TEXT | 'Cash', 'UPI', 'Bank' |

#### `expenses`
Campus expenses tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campus_id | UUID | Campus reference |
| expense_type | TEXT | Category |
| amount | DECIMAL | Expense amount |
| description | TEXT | Details |
| expense_date | DATE | When incurred |

#### `whatsapp_logs`
Audit trail for WhatsApp messages.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Recipient tenant |
| bill_id | UUID | Related bill |
| phone | TEXT | Phone number used |
| status | TEXT | 'sent', 'failed', 'blocked' |
| message_type | TEXT | Template name |
| error_message | TEXT | Error details if failed |

---

## 5. User Roles & Access Control

### Role Hierarchy

```
┌─────────────────┐
│   Super Admin   │  ◄── Full system access
├─────────────────┤
│ • Manage all managers
│ • Approve access requests
│ • View all campuses
│ • System configuration
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Manager      │  ◄── Campus-specific access
├─────────────────┤
│ • Own campuses only
│ • Own tenants only
│ • Own bills only
│ • Own expenses only
└─────────────────┘
```

### Route Protection

| Route Pattern | Access |
|---------------|--------|
| `/` | Public (landing page) |
| `/login` | Public |
| `/request-access` | Public |
| `/dashboard/*` | Manager only |
| `/tenants`, `/rooms`, etc. | Manager only |
| `/super-admin/*` | Super Admin only |

### RLS Policies

Each table has Row Level Security policies that ensure:
- Managers can only see/edit their own data
- Super Admins have elevated access
- Tenants have no direct database access

---

## 6. Feature Modules

### 6.1 Dashboard (`/dashboard`)

**Purpose:** Overview of key metrics and recent activity

**Features:**
- KPI Cards: Total tenants, Pending bills, Monthly revenue, Occupancy rate
- Revenue Chart: Monthly revenue trend (6 months)
- Occupancy Chart: Room utilization
- Upcoming Bills: Bills due in next 7 days with reminder action
- Overdue Bills: Unpaid past-due bills with reminder action

**Data Flow:**
```
useDashboardStats.ts → Dashboard.tsx → KPICard.tsx
                                     → RevenueChart.tsx
                                     → OccupancyChart.tsx
                                     → BillsTable.tsx
```

### 6.2 Campuses (`/campuses`)

**Purpose:** Manage property locations

**Features:**
- List all campuses with stats
- Add/Edit/Delete campuses
- View room count per campus

### 6.3 Rooms (`/rooms`)

**Purpose:** Manage room inventory

**Features:**
- List rooms filtered by campus
- Room types: Single, Double, Triple
- Capacity and rent management
- Active/Inactive status

### 6.4 Tenants (`/tenants`)

**Purpose:** Manage tenant information

**Features:**
- List tenants filtered by campus
- Add new tenant with room assignment
- Track WhatsApp opt-in status
- View tenant type (Student/Working)
- Deactivate tenants on checkout

### 6.5 Billing (`/billing`)

**Purpose:** Manage monthly bills and payments

**Features:**
- View all bills filtered by campus/status/month
- Create manual bills
- Record payments with method
- Bill breakdown: Rent + Electricity + Water + Other
- Payment status tracking

### 6.6 Expenses (`/expenses`)

**Purpose:** Track campus expenses

**Features:**
- Log expenses by category
- Filter by campus and date range
- Expense types: Maintenance, Utilities, Salary, etc.

### 6.7 Reminders (`/reminders`)

**Purpose:** Send WhatsApp payment reminders

**Features:**
- View upcoming bills (5-8 days before due)
- View overdue bills
- Send individual reminders
- Check opt-in status
- View reminder history

### 6.8 Reports (`/reports`)

**Purpose:** Financial reporting

**Features:**
- Revenue reports by period
- Expense reports by category
- Occupancy reports
- Export capabilities

### 6.9 Profile (`/profile`)

**Purpose:** Manager profile settings

**Features:**
- Update profile information
- Enable/disable WhatsApp consent
- Change password

---

## 7. Edge Functions (Backend)

### 7.1 `generate-bills`

**Purpose:** Auto-generate monthly bills for tenants

**Trigger:** Daily cron job or manual invocation

**Logic:**
```
For each active tenant:
  1. Get move_in_date (e.g., 12th)
  2. If today == billing_day (12th of month):
     - Check if bill exists for this month
     - If not, create bill with:
       - rent_amount from tenant
       - due_date = billing_day + 7 days
       - status = 'Pending'
```

**Edge Cases:**
- Month with fewer days: Uses min(move_in_day, last_day_of_month)
- Idempotent: Won't create duplicate bills

### 7.2 `send-whatsapp`

**Purpose:** Send WhatsApp messages via Meta Cloud API

**Templates:**
1. `payment_reminder_v2` - Payment due reminder
2. `payment_confirmation_v2` - Payment received confirmation

**Consent Model:**
```
1. Manager must enable whatsapp_consent in profile ✓
2. Tenant must have whatsapp_optin = true ✓
3. Tenant opts in by messaging Business number first
```

**Request Body:**
```typescript
{
  tenantId: string,
  templateName: "payment_reminder_v2" | "payment_confirmation_v2",
  billId?: string,
  tenantName: string,
  billMonth: string,      // "January 2025"
  dueDate?: string,       // For reminder
  campusName?: string,    // For reminder
  amount?: number,        // For confirmation
  invoiceUrl?: string     // For confirmation
}
```

### 7.3 `whatsapp-webhook`

**Purpose:** Handle incoming WhatsApp messages

**Features:**
- Verify webhook from Meta
- Process incoming messages
- Auto opt-in tenants who message first
- Update `meta_optin_confirmed` flag

### 7.4 `generate-invoice`

**Purpose:** Generate PDF invoices for bills

**Output:** PDF stored in Supabase Storage (`invoices` bucket)

### 7.5 `access-request`

**Purpose:** Handle new manager registration requests

**Flow:**
1. User submits request via `/request-access`
2. Request stored in `pending_requests`
3. Super Admin approves/rejects
4. On approval, user account created

### 7.6 `admin-manage-requests`

**Purpose:** Super Admin actions on access requests

**Actions:**
- Approve request → Create user account
- Reject request → Update status

### 7.7 `bootstrap-admin`

**Purpose:** Initial super admin setup

**Usage:** One-time setup of first super admin account

---

## 8. WhatsApp Integration

### Setup Requirements

1. **Meta Business Account**
   - Facebook Business Manager account
   - WhatsApp Business API access

2. **Environment Variables**
   ```
   WHATSAPP_ACCESS_TOKEN=<your_permanent_token>
   WHATSAPP_PHONE_NUMBER_ID=<your_phone_number_id>
   WHATSAPP_VERIFY_TOKEN=<webhook_verification_token>
   ```

3. **Message Templates**
   - Create templates in Meta Business Manager
   - Templates must be approved by Meta

### Opt-in Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Manager     │     │     Tenant      │     │   WhatsApp API  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Enable WhatsApp   │                       │
         │     in Profile        │                       │
         │──────────────────────►│                       │
         │                       │                       │
         │  2. Share Business    │                       │
         │     WhatsApp Number   │                       │
         │──────────────────────►│                       │
         │                       │                       │
         │                       │  3. Tenant sends      │
         │                       │     "Hi" or any msg   │
         │                       │──────────────────────►│
         │                       │                       │
         │                       │  4. Webhook triggers  │
         │◄──────────────────────┼───────────────────────│
         │                       │                       │
         │  5. Tenant marked     │                       │
         │     as opted-in       │                       │
         │                       │                       │
         │  6. Now can send      │                       │
         │     reminders         │                       │
         │──────────────────────────────────────────────►│
         │                       │                       │
```

### Message Templates

#### payment_reminder_v2
```
Hello {{1}}, this is a reminder from {{4}} that your payment 
for {{2}} is due on {{3}}. Kindly clear it to avoid late 
charges. – PGtrack
```

Variables:
- `{{1}}` - Tenant name
- `{{2}}` - Bill month (e.g., "January 2025")
- `{{3}}` - Due date (e.g., "15 Jan 2025")
- `{{4}}` - Campus name

#### payment_confirmation_v2
```
Hello {{1}}, we've received your payment of ₹{{2}} for {{3}}. 
Your invoice is attached below. Thank you for your timely 
payment! – PGtrack
```

Variables:
- `{{1}}` - Tenant name
- `{{2}}` - Amount (e.g., "8,500")
- `{{3}}` - Bill month

Header: PDF invoice attachment

---

## 9. Authentication Flow

### Login Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │  Login  │     │Supabase │     │ Profile │
│         │     │  Page   │     │  Auth   │     │  Table  │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ 1. Enter      │               │               │
     │    credentials│               │               │
     │──────────────►│               │               │
     │               │               │               │
     │               │ 2. signIn()   │               │
     │               │──────────────►│               │
     │               │               │               │
     │               │ 3. Session    │               │
     │               │◄──────────────│               │
     │               │               │               │
     │               │ 4. Fetch      │               │
     │               │    profile    │──────────────►│
     │               │               │               │
     │               │ 5. Get role   │               │
     │               │◄──────────────┼───────────────│
     │               │               │               │
     │ 6. Redirect based on role     │               │
     │◄──────────────│               │               │
     │               │               │               │
     │   super_admin → /super-admin/overview         │
     │   manager → /dashboard                        │
```

### New Manager Registration

```
1. User visits /request-access
2. Fills form (name, email, phone, reason)
3. Request saved to pending_requests
4. Super Admin sees request in /super-admin/access-requests
5. Super Admin approves → User account created
6. User can now login
```

---

## 10. API Reference

### Supabase Client Usage

```typescript
import { supabase } from "@/integrations/supabase/client";

// Query data
const { data, error } = await supabase
  .from("tenants")
  .select("*")
  .eq("campus_id", campusId);

// Insert data
const { error } = await supabase
  .from("bills")
  .insert({ ...billData });

// Update data
const { error } = await supabase
  .from("tenants")
  .update({ is_active: false })
  .eq("id", tenantId);

// Call Edge Function
const { data, error } = await supabase.functions.invoke("send-whatsapp", {
  body: { tenantId, templateName, ... }
});
```

### Custom Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useCampuses()` | Manage campuses | campuses, addCampus, updateCampus, deleteCampus |
| `useRooms(campusId)` | Manage rooms | rooms, addRoom, updateRoom, deleteRoom |
| `useTenants(campusId)` | Manage tenants | tenants, addTenant, updateTenant |
| `useBills(filters)` | Manage bills | bills, addBill, recordPayment |
| `useExpenses(campusId)` | Manage expenses | expenses, addExpense |
| `useReminders()` | Send reminders | upcomingBills, overdueBills, sendReminder |
| `useDashboardStats()` | Dashboard data | stats, charts, upcoming/overdue |

---

## 11. Security Considerations

### Current Status: ⚠️ NOT PRODUCTION READY

### Critical Issues to Fix

1. **Profiles Table** - May expose emails/phones publicly
2. **Tenants Table** - Personal data needs stricter RLS
3. **Bills Table** - Financial data exposure risk
4. **Pending Requests** - Contact info harvesting risk
5. **WhatsApp Logs** - Communication history exposed

### Recommendations

1. **Harden RLS Policies**
   ```sql
   -- Example: Ensure only owner can read
   CREATE POLICY "Users can only view own tenants"
   ON tenants FOR SELECT
   USING (auth.uid() = user_id);
   ```

2. **Enable Leaked Password Protection**
   - Enable in Supabase Auth settings

3. **Move Extensions from Public Schema**
   - Follow Supabase recommendations

4. **Input Validation**
   - Add Zod schemas for all forms
   - Validate on both client and server

5. **Rate Limiting**
   - Implement on Edge Functions
   - Especially for WhatsApp sending

---

## 12. Deployment Guide

### Prerequisites

- Lovable account
- WhatsApp Business API access (optional)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Auto-provided by Lovable Cloud |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Auto-provided |
| `WHATSAPP_ACCESS_TOKEN` | For WhatsApp | Meta API token |
| `WHATSAPP_PHONE_NUMBER_ID` | For WhatsApp | Business phone ID |
| `WHATSAPP_VERIFY_TOKEN` | For WhatsApp | Webhook verification |

### Deployment Steps

1. **Frontend**: Click "Publish" in Lovable editor
2. **Backend**: Edge Functions deploy automatically
3. **Database**: Migrations run automatically
4. **Custom Domain**: Configure in Project Settings

---

## 13. Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| WhatsApp requires tenant opt-in | Can't send to new tenants | Share business number, ask to message first |
| No bulk reminder sending | Must send one by one | Future feature |
| No email notifications | WhatsApp only | Future feature |
| No mobile app | Web only | Responsive design works on mobile |
| Invoice generation needs config | Payment confirmation limited | Configure PDF generation |

---

## 14. Future Roadmap

### Phase 1 (Security)
- [ ] Fix all RLS policy issues
- [ ] Enable leaked password protection
- [ ] Add input validation

### Phase 2 (Features)
- [ ] Bulk reminder sending
- [ ] Email notification fallback
- [ ] WhatsApp opt-in status indicators
- [ ] Tenant portal (view own bills)

### Phase 3 (Enhancements)
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced reporting with exports
- [ ] Integration with payment gateways

---

## Support

For issues or feature requests, contact the development team or raise an issue in the project repository.

---

*This documentation was generated for PGtrack v1.0.0*
