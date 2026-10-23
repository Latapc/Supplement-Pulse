# Supple Pulse: Personal Regimen Optimization, Physical Serving Inventory & Reliable Forecasting

A streamlined personal health and longevity regimen tracker tailored for a solo user. Resolves inventory decrement math for high-potency compounds, accurately forecasts replenishment for weekly and cyclic protocols, dynamically cleans empty rest-day slots, introduces 1-tap slot batching with consolidated undo, debounces cloud synchronization to protect against API rate limits, and ensures durable multi-year history via IndexedDB.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following core user decisions and formula corrections are explicitly established for execution:
>
> - **Confirmed Decision 1 (Physical Serving Decrement vs. Chemical Potency)**: **Do NOT subtract `doseAmount` from `currentStock`**. In our data model, `doseAmount` represents chemical strength (e.g. 60,000 IU Vitamin D3, 1,500 mg B12, 400 mg Magnesium). Physical stock decrements by serving count: 1 capsule, tablet, or softgel per dose, and only uses `doseAmount` when the unit is physical (`'capsules' | 'tablets' | 'gummies' | 'softgels' | 'drops' | 'pills'`).
> - **Confirmed Decision 2 (Frequency-Aware Refill Forecasting)**: **Replenishment math accounts for scheduling rules rather than raw dose division**. Weekly supplements (e.g. high-dose D3 taken 1x/week on Monday) consume 1 capsule every 7 days (0.14/day), meaning 4 capsules = 28 days of supply. Cyclic supplements (e.g. Boron 14 days on, 7 days off) factor active ratios ($14/21 = 66.7\%$). Rest days and weekly boosters will never trigger false low-stock panic alerts.
> - **Confirmed Decision 3 (Dynamic Slot Hygiene on Rest Days)**: **Only populated time slots are rendered on any given day**. Unscheduled or inactive timing slots (such as Pre-Workout or Post-Workout on rest days) are dynamically filtered out, keeping the screen compact, focused, and free of empty placeholder headers.
> - **Confirmed Decision 4 (1-Tap Slot Batch Completion)**: **Dedicated "Take All [Slot]" actions in every populated group header** (e.g., "Take All Morning", "Take All Bedtime"). Logs all pending slot doses simultaneously, decrements physical stock by 1 per supplement, and provides a 5-second consolidated undo toast ("Logged X morning doses · [Undo All]").
> - **Confirmed Decision 5 (2-Second Drive Sync Debounce)**: **Local state and IndexedDB update instantly; Google Drive cloud uploads are debounced by 2 seconds**. When checking off items rapidly or using "Take All", local UI is latency-free, while remote Drive saves wait for 2 seconds of quiet inactivity to package changes into a single atomic write, eliminating Google Drive API rate limits (HTTP 429) and save-race collisions.
> - **Confirmed Decision 6 (App.tsx Clean Compilation Guarantee)**: **All referenced states, computations, and handlers in `App.tsx` are fully declared and typed**. Includes `activeProfile`, `profileMap`, `handleOpenSpecialChat`, `handleOpenStandardChat`, `handleSelectProfile`, `handleSaveProfiles`, and `handleDeleteProfile`, guaranteeing zero TypeScript errors and zero runtime ReferenceErrors.
> - **Confirmed Decision 7 (Single-User Profile Model)**: **Single user by default with optional tags and zero PIN popups**. Removes all parental PIN code dialogs (`1234`) and multi-tenant friction while preserving optional member tags.
> - **Confirmed Decision 8 (Storage Longevity & Medical Export)**: **IndexedDB via `idb-keyval` with automatic localStorage migration and one-click CSV export** for medical reviews and physician bloodwork consultations.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms Supple Pulse into a tactile, distraction-free daily supplement companion. Organizes your stack into biological time slots (Morning Fasted, With Meals, Bedtime), enables 1-tap batch completion, protects multi-year intake logs in IndexedDB, provides mathematically exact refill dates, and syncs safely to private Google Drive storage.
- **Target Audience**: A solo individual optimizing their health, nutrition, and longevity regimen across specific physiological windows without unnecessary authentication steps or PIN dialogs.
- **Key Value**: Accurate inventory accounting that understands chemical potency vs. physical pills, smart rest-day slot cleaning, rapid batch logging, zero data eviction risks, and reliable Android alarm notifications.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **1-Tap Slot Batch Logging & Consolidated Undo**:
   - Opening the **Today** tab presents only the time slots relevant to today's schedule (e.g. Morning and Bedtime on a rest day; workout slots stay hidden).
   - In the header of each slot group (e.g., "Morning / Empty Stomach"), a high-contrast `[✓ Take All Morning (3)]` action allows checking off all 3 items simultaneously.
   - Tapping it triggers tactile haptic feedback, celebratory visual motion, decrements physical bottle stock by 1 per supplement, and displays a floating consolidated toast: `"Logged 3 morning doses · [Undo All]"`.
   - Tapping `"Undo All"` restores the previous doses and returns inventory counts immediately.

2. **Accurate Inventory & Refill Forecasting**:
   - Each supplement card displays its remaining physical doses and exact depletion date (e.g. `"4 capsules left · Reorder by Nov 18"` for weekly Vitamin D3).
   - Dynamic 7-day low-stock warning banners only trigger when actual days of supply drop to 7 or fewer based on true consumption frequency.
   - Refill predictions remain active even when bottle price fields are left blank.

3. **Rest-Day Slot Cleanliness**:
   - On days when workout supplements are not scheduled, the screen contains zero empty "Pre-Workout" or "Post-Workout" sections.
   - Supplements automatically group into biological slots based on food timing (`empty_stomach` $\to$ Morning, `before_bed` $\to$ Bedtime, `with_food` $\to$ With Meals) or scheduled clock hour.

4. **Medical CSV Export**:
   - In the **History** tab, a `"Download CSV"` action instantly generates a formatted, quote-escaped spreadsheet file containing timestamps, supplement names, physical forms, doses, and clinical notes for physician review.

#### Visual Identity & Ergonomics
- **Aesthetic Direction**: Clinical yet warm editorial wellness aesthetic (deep forest emerald, slate canvas, warm amber accents, crisp typography).
- **Typography**: Characterful display serif/sans pairing with strict tabular numerals (`font-mono tabular-nums`) for dosages, days remaining, and inventory counts.
- **Thumb Zone Compliance**: All primary batch buttons and check-off targets maintain a minimum $44 \times 44\text{px}$ touch hitbox.
- **Zero-Pill Discipline**: Metadata (categories, dates, schedule tags) renders as clean unboxed text with subtle typographic dot separators (`·`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Physical Serving vs. Chemical Potency Separation**
  - *Chosen Approach*: When a dose is checked off, deduct physical servings (`1` capsule/tablet/softgel, or a dedicated `servingsPerDose` field). Never subtract `doseAmount` when unit is a chemical measurement (`mg`, `mcg`, `IU`, `g`, `ml`).
  - *Why*: Eliminates the catastrophic bug where taking a 60,000 IU Vitamin D3 capsule dropped bottle stock from 30 to -59,970.
  - *Alternatives Considered*: Forcing the user to enter dose amounts only as pill counts was rejected because clinical tracking requires recording the actual active milligrams or International Units.

- **Decision 2: Protocol-Aware Consumption Rate Formula**
  - *Chosen Approach*: Compute `pillsPerDay` by factoring `frequencyType` (daily, weekly, interval, monthly) and cyclic active ratios (`onDays / (onDays + offDays)`).
  - *Why*: Prevents weekly supplements (like 60,000 IU D3) and cyclic compounds (like Boron 14d on / 7d off) from triggering false low-stock emergencies.
  - *Alternatives Considered*: Naive division (`currentStock / doseAmount`) was discarded as mathematically invalid for non-daily protocols.

- **Decision 3: Debounced Google Drive Synchronization (2-Second Window)**
  - *Chosen Approach*: Update local state and IndexedDB immediately on every checkmark or batch tap. Delay Google Drive cloud uploads with a 2-second trailing debounce.
  - *Why*: Completely prevents Google Drive API 429 quota exhaustion and eliminates save-race collisions when checking off multiple items rapidly.
  - *Alternatives Considered*: Immediate saving per tap was rejected due to Google Cloud rate-limits during rapid check-offs.

- **Decision 4: Decoupled Refill Forecasting from Pricing**
  - *Chosen Approach*: Days remaining and reorder dates calculate solely from stock counts and schedules. The financial calculator is an optional supplementary feature.
  - *Why*: Ensures solo users who do not track financial prices still get full inventory warnings and refill dates.

---

### 4. Technical Architecture & Data Strategy

#### System & Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              USER VIEWPORT                             │
└────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────┐                         ┌───────────────────────┐
│     HEADER BAR       │                         │    TODAY CHECKLIST    │
│  - Active Profile    │                         │  - Populated Slots    │
│  - Cloud Backup Modal│                         │  - "Take All [Slot]"  │
│  - Theme Toggle      │                         │  - Physical Stock Dec │
└──────────────────────┘                         │  - Dynamic Restock Dt │
                                                 └───────────────────────┘
                                                             │
                                                             ▼
                                                 ┌───────────────────────┐
                                                 │ CONSOLIDATED TOAST    │
                                                 │  - 5-Second Timer     │
                                                 │  - Instant Undo All   │
                                                 └───────────────────────┘
                                                             │
           ┌─────────────────────────────────────────────────┴───────────┐
           ▼                                                             ▼
┌───────────────────────────────┐                             ┌───────────────────────┐
│       LOCAL STORAGE LAYER     │                             │  BACKGROUND ALARMS    │
│  - Synchronous In-Memory Cache│                             │  - @capacitor/        │
│  - IndexedDB (idb-keyval)     │                             │    local-notifications│
│  - Auto-Migration from Local  │                             │  - System AlarmMgr    │
└───────────────────────────────┘                             └───────────────────────┘
               │
               ▼ (2-Second Trailing Debounce)
┌───────────────────────────────┐
│      GOOGLE DRIVE BACKUP      │
│  - Single Consolidated Patch  │
│  - Zero Rate-Limit Overhead   │
└───────────────────────────────┘
```

#### Core Data Entities

1. **Supplement Item**:
   - `id`: Unique identifier
   - `name`: Compound name (e.g., "Vitamin D3", "Boron")
   - `doseAmount`: Chemical strength (e.g. 60000, 1500, 6)
   - `unit`: Chemical unit (`IU`, `mg`, `mcg`) or physical unit (`capsules`, `tablets`)
   - `servingsPerDose`: Physical serving count consumed per take (defaults to `1`)
   - `frequencyType`: `'daily' | 'weekly' | 'interval' | 'monthly'`
   - `selectedDays`: Days of the week for weekly dosing (`[1]` = Monday)
   - `cycleConfig`: Optional cyclic protocol (`{ isCyclic: true, onDays: 14, offDays: 7 }`)
   - `inventory`: `{ trackStock: true, currentStock: number, bottleSize: number }`

2. **Dose Log**:
   - `id`: Unique log identifier
   - `supplementId`: Referenced supplement
   - `date`: Date string `YYYY-MM-DD`
   - `time`: Scheduled or intake time `HH:MM`
   - `amountTaken`: Chemical strength logged
   - `servingsDeducted`: Physical count deducted from stock (`1` by default)
   - `timestamp`: High-precision ISO string

#### Interactive State & Event Mapping

- **Batch Take All**:
  `handleTakeAllSlot(items, slotLabel)` $\to$ Filters pending items $\to$ Emits dose logs $\to$ Decrements physical stock by `pillsPerTake` $\to$ Dispatches IndexedDB write $\to$ Sets consolidated undo toast $\to$ Triggers 2-second debounced Google Drive backup.
- **Undo Batch**:
  `handleUndoBatch()` $\to$ Reverts physical stocks $\to$ Deletes generated dose logs from IndexedDB $\to$ Dismisses toast.
- **Stock Depletion Math**:
  `calculateStockDaysRemaining(supp)` $\to$ Evaluates physical servings / daily rate based on schedule frequency $\to$ Yields `daysRemaining` and formatted `refillDateFormatted`.
