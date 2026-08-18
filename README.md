# Staff Scheduling System

A web application that helps a store manager create weekly staff schedules based on historical transaction demand while respecting staff working-hour limits and balancing workload.

## Prerequisites

Make sure the following are installed:

- [Docker](https://www.docker.com/)
- Node.js 22+

## Installation & Running

### 1. Start the infrastructure

From the project root:

```bash
docker compose -f docker-compose.dev.yaml up
```

Keep this terminal running.

### 2. Configure environment variables

Create a `.env` file in both the `BE` and `FE` directories.

Use the corresponding `.env.example` file as the template:

```text
BE/.env.example → BE/.env
FE/.env.example → FE/.env
```

### 3. Start the backend

Open a new terminal:

```bash
cd .\BE\
npm i
npx prisma generate
npx prisma migrate deploy
npm run build
node dist/src/main.js
```

Keep this terminal running.

### 4. Start the frontend

Open another terminal:

```bash
cd .\FE\
npm i
npm run build
npm run start
```

The application is now ready to use.

---

## Auto-Scheduler

The auto-scheduler generates a draft weekly roster from the uploaded transaction data, configured shifts, and available staff.

### 1. Estimate hourly staffing demand

Transaction count is converted into the required number of staff using:

```text
requiredStaff = max(1, ceil(transactions / N))
```

where `N = 15` transactions per staff-hour by default.

The minimum of one staff member is applied even when an hour has zero transactions.

### 2. Determine shift staffing requirements

For each configured shift, the scheduler examines the hourly requirements covered by that shift.

The shift's target staffing level is the maximum hourly requirement within the shift:

```text
peakRequiredStaff = max(requiredStaff for hours in shift)
```

This means busy hours can cause more staff to be assigned to a shift, while the scheduler still respects the configured shift boundaries.

### 3. Allocate staff-hour capacity

The scheduler first calculates the total available staff-hour capacity:

```text
totalStaffCapacity = sum(maxWeeklyHours of all staff)
```

It then allocates this capacity to shift slots iteratively.

Each shift is prioritized by:

```text
(
  peakCoverageRatio ASC,
  marginalCoverageRatio DESC,
  peakRequiredStaff DESC
)
```

Where:

```text
peakCoverageRatio =
  currentStaffSlots / peakRequiredStaff
```

A lower value means the shift has received less of its required peak staffing.

```text
marginalCoverageRatio =
  marginalCoverageValue / shiftDuration
```

This represents how much of the shift would benefit from adding one more staff member.

The shift with the highest priority receives one additional staff slot, after which priorities are recalculated. This continues until all shift targets are reached or available capacity is exhausted.

### 4. Assign staff

After determining the number of staff slots for each shift, shifts are processed in ascending order of allocated staff count.

For each slot, the scheduler selects an eligible staff member with the lowest current workload utilization:

```text
utilization =
  assignedWeeklyHours / maxWeeklyHours
```

A staff member is eligible only when assigning the shift would not exceed their maximum weekly hours.

This separates two concerns:

- **Demand determines where staff capacity should be allocated.**
- **Workload utilization determines which staff member receives the assignment.**

### 5. Trade-offs and warnings

Maximum weekly hours are treated as a hard constraint and are never exceeded.

When available staff capacity is insufficient to satisfy demand, the scheduler still generates the best feasible draft and reports understaffed hours rather than assigning staff beyond their limits.

When available staff capacity exceeds demand, the scheduler does not force staff to their maximum hours. Unused capacity is surfaced to the manager.

The generated schedule is a **draft**. The manager can review and modify it before submitting it as the official schedule.

## Aggregated Summary

The schedule view also provides an aggregated summary by day and hour.

Each cell displays:

- Transactions
- Staff hours
- Transactions per staff hour

When no staff are scheduled for an hour, transactions per staff hour is displayed as `–`.

The weekly summary displays:

- Total staff hours
- Total transactions
- Overall transactions per staff hour
- Average transactions per staff hour

The overall metric is calculated from total transactions and total staff hours, while the average metric is the arithmetic mean of the per-hour transactions-per-staff-hour values for hours with staff scheduled.

## Assumptions

- `N`, the expected number of transactions handled by one staff member per hour, defaults to **15**.
- Every hour represented in the transaction data is considered an operating hour and requires at least **one staff member**, even when transactions are zero.
- Auto-scheduling uses the **configured shifts** and does not create or modify shift definitions.
- A staff member cannot be assigned to a shift if doing so would exceed their maximum weekly hours.
- Workload fairness is measured using relative utilization (`assigned hours / maximum hours`) rather than absolute assigned hours, allowing staff with different contracted maximums to be compared fairly.
- When demand exceeds available staff capacity, the system prioritizes feasible coverage and reports the remaining shortage instead of violating staff-hour limits.
- When staff capacity exceeds demand, unused capacity is allowed and reported.
- The auto-scheduler produces a draft; assignments become official only after the manager submits the draft.